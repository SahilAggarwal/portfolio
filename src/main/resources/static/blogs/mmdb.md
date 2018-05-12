
Notes on [paper on Main Memory Database System](https://15721.courses.cs.cmu.edu/spring2018/papers/02-inmemory/garciamolina-tkde1992.pdf)

**MMDB**: primary copy lives permanently in memory

**DRDB**: primary data lives on disk even though some data may be cached for fast access.

In both cases data lives both on disk and in memory.

**Key differences disk vs memory:** 

* access time of memory is way less than that of disk.
* memory is volatile (possible to construct non volatile)
* Disk have high cost per access that does not depend on amount of data read. (due to this disks are block oriented and memory not)
* Disk layout is more critical in disk as sequential reads are faster than random whereas in memory it doesn't matter.
* Main memory accessible by processor while disks are not which makes them more vulnerable to software errors.

These differences affects every aspect of MMDBs from concurrency to application interface.

**Reasonable to assume whole data fits in memory?**

* Some applications whose data is very less and growth rate not very significant, whole data can reside in memory.
* Some applications have tight latency constraint and require data size to very less and completely in memory. for eg trading.
* There will of-course be apps whose data which won't fit completely in memory and require DRDB but even these apps can divide data set to hot(MMDB) and cold(DRDB). for eg. banking - accounts balance is hot, account details is cold.
  * Can be totally disjoint databases and app access them as lose federation of databases.
  * Can be tightly integrated which ability to auto migration on basis of access pattern.
    * Not similar to cache as in cache data just moves to different level of storage hierarchy but the management(concurrency control etc) is same.
    * With migration objects move to different management system and its structure and access mechanism changes. 

**Difference b/w MMDB and DRDB with a very large cache?**

* if cache of DRDB large enough whole data may reside in memory, it may perform well but it still doesn't take full adv of it being in memory.
* Index structure will be B-Tree which is designed for disk access even though data is in memory.
* Data is accessed through buffer manager as if data is on disk. Disk address will be computed, buffer manager will be invoked to check if it is present in memory, if found will be copied to apps memory
* Memory access would have been more efficient.

Note: Some DRDB have already started porting MMDB in memory optimizations.

**Can we assume that main memory is nonvolatile and reliable by introducing special purpose hardware?**

* Adding battery, UPS, error correcting etc will only reduce probability of failure but doesn't bring it to 0 hence backing up to disk required.
* Even DRDB requires backup to tape or other disks.
* For in memory frequency of backups is important too:
  * More vulnerable to software errors hence can lead to system crash any time.
  * If 1 disk fails, it can be recovered without affecting other disks and app may keep working partially. In case of memory who system will crash losing entire database. Recovery will take more time depending upon time of latest backup. (older the backup more time it takes to bring it up from logs.)
  * batteries or UPS are active hardwares, disks are passive. UPS batteries can die anytime.
Memory backups are very important and backup performance is also critical.

**Impact of memory resident data**


*Concurrency Control*

* Transactions will be short lived as data is in memory i.e less lock contention.
* Large lock granules more appropriate for memory as contention is already low.
* In extreme whole DB can be single granule in which case it will be serial.
  * Cost of concurrency control eliminated
  * No of CPU flushes is greatly reduced(cpu cache changes more frequently if multiple transactions running at instant)
can save thousands of instructions associated with CPU flush.
* However, serial is not practical when long transactions possible hence there should be way to run short transactions concurrently.
* In DRDB system locking is supported by maintaining hash of blocks which are locked, objects(on disk) themselves does not hold any such information.
* For MMDB since objects are in memory, we can afford to add small number of bits to represent their lock status.
  * If 1st bit is set, object is locked.
  * if 2nd bit is set then there are one or more waiting transactions.
  * Identity of these waiting transactions can be stored in normal hash lock table.
  * If transaction wants lock, it checks 1st bit, if unset, it sets it and get the lock (CAS may be required)
  * If second transaction wants to wait on lock, it sets 2nd bit and add itself to the waiting transactions in lock table.
  * Also helps in cache locality

*Commit processing*

* Necessary to keeps logs of transaction activity and backups.
* Logs must be in stable storage. Before commit it must be written to stable storage.
* Can impact the response time since write may be bottleneck on this stable storage write.
* Some possible solutions:
  * small amount of stable main memory can be used to hold portion of log. Special process is responsible to copy to stable disk. Will reduce the response time.
  * Can pre-commit the transaction: don't wait for write to be flushed to disk. May not reduce response time but will reduce the blocking time.(hence response time of other transactions).
Group commits

*Access methods*

* BTree index not very optimal for in memory stored objects.
* Hash more efficient for lookups and updates but consume more memory than tree also does not support range queries.
* T-Tree designed for memory resident databases. (not longer better than B+Tree(data is with index itself hence cache hit) now as SRAM is much fater than DRAM these days and TTrees were not cache aware.
* Main memory tree need not have short structure as of BTree since traversing deeper nodes is much faster than disk.
* Data values on which index is build need not be stored in index as in BTree since pointers can be followed quickly.
* Eliminates problem of storing variable length fields in index and saves a lot of space.
* Can simply be inversion of pointer-data relation. Can be sorted list of pointers. Fast for range and exact match queries, updates will be slow though.
* Indexes not stored on disk but rather build on start up as it saves flushing indexes to disk and maintaining them.


*Data representation*

* Can take advantage of pointer following for data representation
* use of pointer is space efficient and can simplify handling variable length fields.

*Query processing*

* sequential access in disk not faster than random access in memory hence technique when used in memory lose its benefit.
* for eg. sort-merge join processing first sort joined relations and creates the sequential access whereas in memory it can be represented by just pointers.
* R join S on some A atttribute. We can start with smaller relation R, for each tuple follow A pointer to actual value a from which we follow all pointers of S. We join R and S and add them to result.
* Since data is in memory possible to construct data structure to optimize queries.
* Query processors focus more on processing in case of memory instead of disk access for disks

*Recovery*

* Backups must be maintained.
* Keeping the disk backup upto date and recover from logs from failure.
* Check-pointing to keep the backup upto date and reduce the recovery time.
* Since transaction doesn't need disk access, only checkpointing requires disk access hence disk access can be tailored for its use case.
* Transaction consistent checkpointing requires some sync with transactions. One possible way is to do fuzzy dumping which requires no sync.
* After failure whole database need to be transferred from disk which may take a lot of time.
  * Load blocks on demand? Not sure how much gain for performance sensitive systems.
  * Have disk array and read in parallel but there must be independent paths from disk to memory.

*Performance*

* for MMDB it mainly depends on processing time (commit log being exception)
* Even recovery is affected due to processing since disk operation is performed outside transaction (no locking)
* DRDB uses I/O operations to determine the performance of algo.
* Not only performance metrics different but also components under analysis are different.
* For DRDB backups do not impact performance  where as in MMDB it is studied more carefully.

*Application programming interface and protection*
* in DRDB data exchange happens through private buffers. PB -> BP -> disk -> BP -> PB.
* in MMDB app can be given directly the address of the object id accessed.
  * Avoids costly translation
  * Can also omit the private buffers and db can give direct access to the object.
  * performance gain can be significant if transaction is simple.
    * transaction can access db directly and modify the parts without any log being committed.
    * sol: run only compiled transactions, compiler will emit the code and logs every modification.

*Data clustering and migration*

  * in DRDB objects that are access together can be kept closer.
  * in MMDB clustering not requited as objects can be dispersed.
    * What happens when MMDB need to migrate data to disk? How it should lay it out?
    * User can specify how objects are clustered.
    * Cluster according to access pattern.
    
Migration and dynamic clustering is problem only particular to MMDB.