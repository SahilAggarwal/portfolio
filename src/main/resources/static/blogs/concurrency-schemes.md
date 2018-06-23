This is part-1 of notes on paper on [An Evaluation of Concurrency Control with One Thousand Cores](https://15721.courses.cs.cmu.edu/spring2018/papers/04-occ/p209-yu.pdf) where we look at different concurrency control ways. Part-II will cover another half of this paper i.e how these schemes perform under different workloads on a single machine of ~1000 cores.


An OLTP DBMS is expected to maintain four properties for each transaction that it executes: Atomicity, Consistency, Isolation, Durability. Concurrency control permits end-users to access a database in a multi-programmed fashion while preserving the illusion that each of them is executing their transaction alone on a dedicated system. It essentially provides the atomicity and isolation guarantees in the system. All concurrency schemes are **either a variant of two-phase locking or timestamp ordering protocols.**

**Two-Phase locking:**

- Transaction have to acquire locks for a particular element in the database before they are allowed to execute a read or write op.
- DBMS maintains locks for either each tuple or at a higher logical level (e.g., tables, partitions)
- Ownership of locks governed by 2 rules:
  -  different transactions cannot simultaneously own conflicting locks
  - once a transaction surrenders ownership of a lock, it may never obtain additional locks
- In the first phase of 2PL, known as the growing phase, the transaction is allowed to acquire as many locks as it needs without releasing locks
- When the transaction releases a lock, it enters the second phase, known as the shrinking phase; it is prohibited from obtaining additional locks at this point
- When the transaction terminates (either by committing or aborting), all the remaining locks are automatically released back to the coordinator
- 2PL is considered a pessimistic approach in that it assumes that transactions will conflict and thus they need to acquire locks to avoid this problem. If a transaction is unable to acquire a lock for an element, then it is forced to wait until the lock becomes available
- If this waiting is uncontrolled (i.e., indefinite), then the DBMS can incur deadlocks
- Thus, a major difference among the different variants of 2PL is in how they handle deadlocks and the actions that they take when a deadlock is detected

*2PL with Deadlock Detection (DL_DETECT):*

- The DBMS monitors a waits-for graph of transactions and checks for cycles (i.e., deadlocks)
- When a deadlock is found, the system must choose a transaction to abort and restart in order to break the cycle
- The detector chooses which transaction to abort based on the amount of resources it has already used (e.g., the number of locks it holds) to minimize the cost of restarting a transaction

*2PL with Non-waiting Deadlock Prevention (NO_WAIT):*

- Unlike deadlock detection where the DBMS waits to find deadlocks after they occur, this approach is more cautious in that a transaction is aborted when the system suspects that a deadlock might occur
- When a lock request is denied, the scheduler immediately aborts the requesting transaction (i.e., it is not allowed to wait to acquire the lock).

*2PL with Waiting Deadlock Prevention (WAIT_DIE):*

- This is a non-preemptive variation of the NO_WAIT scheme technique where a transaction is allowed to wait for the transaction that holds the lock that it needs if that transaction is older than the one that holds the lock
- If the requesting transaction is younger, then it is aborted (hence the term “dies”) and is forced to restart
-  Each transaction needs to acquire a timestamp before its execution and the timestamp ordering guarantees that no deadlocks can occur.


**Timestamp ordering:**

- Timestamp ordering (T/O) concurrency control schemes generate a serialization order of transactions a priori and then the DBMS enforces this order.
- A transaction is assigned a unique, monotonically increasing timestamp before it is executed
- this timestamp is used by the DBMS to process conflicting operations in the proper order (e.g., read and write operations on the same element, or two separate write operations on the same element)
- Key differences between the different T/O schemes are
     - the granularity that the DBMS checks for conflicts (i.e., tuples vs. partitions)
     - when the DBMS checks for these conflicts (i.e., while the transaction is running or at the end).

*Basic T/O (TIMESTAMP):*

- Every time a transaction reads or modifies a tuple in the database, the DBMS compares the timestamp of the transaction with the timestamp of the last transaction that reads or writes the same tuple.
- For any read or write operation, the DBMS rejects the request if the transaction’s timestamp is less than the timestamp of the last write to that tuple
- Likewise, for a write operation, the DBMS rejects it if the transaction’s timestamp is less than the timestamp of the last read to that tuple


*Multi-version Concurrency Control (MVCC):*

- Under MVCC, every write operation creates a new version of a tuple in the database
- The DBMS maintains an internal list of the versions of an element. For a read operation, the DBMS determines which version in this list the transaction will access.
- Thus, it ensures a serializable ordering of all operations. One benefit of MVCC is that the DBMS does not reject operations that arrive late
- That is, the DBMS does not reject a read operation because the element that it targets has already been overwritten by another transaction

*Optimistic Concurrency Control (OCC):*

- The DBMS tracks the read/write sets of each transaction and stores all of their write operations in their private workspace
- When a transaction commits, the system determines whether that transaction’s read set overlaps with the write set of any concurrent transactions.
- If no overlap exists, then the DBMS applies the changes from the transaction’s workspace into the database; otherwise, the transaction is aborted and restarted.
-  The advantage of this approach for main memory DBMSs is that transactions write their updates to shared memory only at commit time, and thus the contention period is short


*T/O with Partition-level Locking (H-STORE):*

- The database is divided into disjoint subsets of memory called partitions
- Each partition is protected by a lock and is assigned a single-threaded execution engine that has exclusive access to that partition
- Each transaction must acquire the locks for all of the partitions that it needs to access before it is allowed to start running.
- This requires the DBMS to know what partitions that each individual transaction will access before it begins
- When a transaction request arrives, the DBMS assigns it a timestamp and then adds it to all of the lock acquisition queues for its target partitions. The execution engine for a partition removes a transaction from the queue and grants it access to that partition if the transaction has the oldest timestamp in the queue