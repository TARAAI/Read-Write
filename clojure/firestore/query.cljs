(ns firestore.query
  (:require [clojure.core.async :refer [go <! >! chan]]
            [taoensso.timbre :as timbre]
            [taoensso.tufte :as tufte :refer [defnp p profiled profile]]
            [cljs-time.core :as t]
            [cljs-time.coerce :as tc]
            [clojure.pprint]
            [clojure.string :as str]
            [clojure.set :refer [subset?]]
            integrant.repl.state
            ["firebase-admin" :as firebase]
            ["../../src/firestore/query" :as queryJS]))

(def ^:private performance (-> "perf_hooks" js/require .-performance))
(declare query->refs)
(declare firestore->clj)
(declare inspect-query)

(comment

  (go (prn (<! (backend.node.firebase.firestore.query/query {:group "users" :limit 1}))))

  (backend.node.firebase.firestore.query/query {:group "users" :limit 1})

  (query {:path "/users"
          :fields ["name"]
          :where [["__name__", "in",  ["A" "B" "C" "E" "F" "G" "H" "I" "J" "K" "L" "M"]]]})

  (query {:path "/user/H29uy6KLRMRjivT5IxFzjnwsoXf1/txn"
          :fields ["name" "date"]
          :where [["date", "<", (js/Date.)]]
          :order [["date" "asc"]]
          :limit 4})

  (query {:path "/user"
          :fields ["name"]
          :where [["__name__", "in",  ["A" "B" "C"]]]}))

(comment
  "Profiles -
      query -> (map :query->refs) -> query
   Logging -
      query -> :info query-edn -> :trace firestore->clj -> :trace query-results")

(defn- firestore [] (get-in integrant.repl.state/system [:firebase/firestore :firestore]))

(defnp query
  "Firestore load via query map.
   Reader is typically an instance of a transaction to make reads ACID compliant.
   Exmaples:
   {:path \"/user/xxxx\"
    :where [[\"date\", \"<\", (js/Date.)] [\"name\" \"==\" \"Amazon\"]]
    :order [[\"date\" \"desc\"]]
    :limit 4}

   {:path \"/user/xxxx\"
    :fields [\"id\"]
    :where [[\"__name__\", \"in\",  (into [] (range 20))]}"
  ([q] (query q nil (firestore)))
  ([q reader] (query q reader nil))
  ([{:keys [path fields order where limit] :as q} reader admin]
   (let [query-refs (query->refs (or reader admin) q)
         out        (chan)
         pd         (tufte/new-pdata)
         t0         (performance.now)]
     (queryJS/firestoreRef admin (clj->js q))
     (try
       (->
         (reduce
           (fn [arr coll]

             ;; (timbre/info (inspect-query (or reader coll)))

             (.concat
               arr
               (->
                 (if (nil? reader)
                   (.get coll)
                   (.get reader coll))
                 (.then firestore->clj))))
           #js[]
           query-refs)
         (js/Promise.all)
         (.then (fn [results] (into [] (.reduce results #(concat %1 %2) []))))
         (.then (fn [v] (if (nil? fields) v (map #(select-keys % (map keyword fields)) v))))
         (.then (fn [res] (tufte/capture-time! pd :query (- t0 (performance.now))) res))
         (.then #(do (timbre/trace %) %))
         (.then (fn [output] (go (>! out output))))
         (.catch (fn [err] (timbre/error err q) (go (>! out err)))))
       (catch js/Error err
         (timbre/error err q)
         (throw err)))
     out)))


;; ----- query -----

(defn- update-query-in-clause
  "Override all in/not-in/array-contains-any with new values force firestore's max limit."
  [{:keys [where] :as query} override]
  (update-in
    query
    [:where]
    (fn [wheres]
      (let [wheres (if (vector? (first where)) where [where])]
        (into
          []
          (map
            (fn [clause]
              (if (subset? (second clause) #{"in" "not-in" "array-contains-any"})
                (into [] (assoc clause 2 (into [] override)))
                clause)))
          wheres)))))

(defn- query->queries
  "Batch loading when searching multiple document ids.
   @see https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any"
  [{:keys [where] :as query}]
  (let [firestore-limit 10
        wheres (if (vector? (first where)) where [where])
        queries (atom [])]
    (doseq [[_ op values] wheres]
      (when (subset? op #{"in" "not-in" "array-contains-any"})
        (loop [v values]
          (swap! queries conj (update-query-in-clause query (take firestore-limit v)))
          (when-not (empty? (drop firestore-limit v))
            (recur (drop firestore-limit v))))))
    (if (empty? @queries) [query] @queries)))

(defn- path->queryRef
  "Path to firestore query/collection/doc reference."
  [firestore {:keys [id] :as query}]
  (let [fs-path   (get query :firestore/path (:path query))
        path      (if (= (first fs-path) "/") fs-path (str "/" fs-path))
        coll-path (rest (clojure.string/split path "/"))
        doc-path  (remove empty? (concat coll-path [id]))]
    (reduce-kv
      (fn [fs index slug]

        (when (= slug "")
          (throw (js/Error. (str "path " fs-path " is malformed."))))

        (if (= (mod index 2) 0)
          (.collection fs slug)
          (.doc fs slug)))

      firestore
      (into [] doc-path))))

(defn- group->coll
  "Group to collection group"
  [firestore query]
  (let [collection-name (get query :firestore/group (:group query))]
    (.collectionGroup firestore collection-name)))

(defn path->coll
  [admin query-map]
  (timbre/debug query-map)
  (if (nil? (get query-map :firestore/group (:group query-map)))
    (path->queryRef admin query-map)
    (group->coll admin query-map)))

(defn- where!
  "Mutate a ref with where clauses."
  [coll {:keys [where]}]
  (let [wheres (if (vector? (first where)) where [where])]

    (try

      (reduce
        (fn [coll [field operation value]]
          (.where
            coll
            field
            operation
            (cond
              (vector? value)  (clj->js value)
              (t/date? value)  (tc/to-date value)
              :else value)))
        coll
        wheres)

      (catch js/Error err
        (timbre/error err {:coll coll :coll.type (type coll) :wheres wheres :stack (.-stack err)})
        (throw err)))))

(defn- order!
  "Mutate a ref with order by."
  [coll {:keys [order]}]
  (let [orders (if (vector? (first order)) order [order])]
    (reduce
      (fn [coll [field direction]]
        (.orderBy
          coll
          (name field)
          (if direction (name direction) "asc")))
      coll
      orders)))

(defn- limit!
  "Mutate a ref with limits."
  [coll {:keys [limit]}]
  (.limit coll limit))

(defn query->refs
  [admin {:keys [path order where limit] :as query}]
  (p :query->refs
     (let [queries (query->queries query)]
       (map
         #(cond-> (path->coll admin %)

            (some? (:where %))
            (where! %)

            (some? (:order %))
            (order! %)

            (some? (:limit %))
            (limit! %))
         ;; (timbre/spy :info queries)
         queries))))

;; ----- internal -----

(defn firestore->clj
  [doc]
  (let [fs->clj #(assoc
                   (js->clj (.data %) :keywordize-keys true)
                   :id (-> % .-ref .-id)
                   :firestore/path (-> % .-ref .-parent .-path))]
    (timbre/trace doc)

    (cond
      (or (false? (.-exists doc)) (true? (.-empty doc)))
      []

      (some? (.-docs doc))
      (.reduce (.-docs doc) #(conj %1 (fs->clj %2)) [])

      (some? (.-data doc))
      [(fs->clj doc)]

      (js/Array.isArray doc)
      (.reduce doc #(conj %1 (fs->clj %2)) [])

      :else nil)))

(defn- inspect-query ; TODO: move to timbre custom logger
  [coll]
  (str
    (-> coll (.-_path) (js/JSON.stringify nil 2))
    (-> coll (.-_queryOptions) (js/JSON.stringify nil 2))))
