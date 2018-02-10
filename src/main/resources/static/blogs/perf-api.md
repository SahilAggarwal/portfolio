Profiling can be very helpful while debugging or throttling application to bring down the latencies and optimize the application at system level. There are many profiling tools such as dtrace, systemtap, ktap, ftrace, perf etc from which only few are safe to use on production machines(ftrace, perf).

If you as a developer or system engineer want to dig out source of latencies or unexpected behaviour by application, you may wish to write something on top of ftrace or perf to quickly run it. While [Brendan Gregg](http://www.brendangregg.com) has written very useful [scipts](https://github.com/brendangregg/perf-tools) on top of ftrace, this article will focus on more efficent way of writing such application by using `perf_event_open()` system call instead of using ftrace

[`perf_event_open()`](http://man7.org/linux/man-pages/man2/perf_event_open.2.html) is a system call which can be used to enable profiling on tracepoints available through ftrace, same being used by perf tool.It return file descriptor which corresponds to the event being traced. If sampling is enabled it makes that stream ring buffer which can be mmap'ed otherwise it just stores the counter of the event. Since it return binary of struct format of event, string parsing is not required unlike in ftrace. For eg:

```
$ cat /sys/kernel/debug/tracing/events/sched/sched_switch/format
    name: sched_switch
    ID: 229
    format:
    field:unsigned short common_type;   offset:0;   size:2; signed:0;
    field:unsigned char common_flags;   offset:2;   size:1; signed:0;
    field:unsigned char common_preempt_count;   offset:3;   size:1; signed:0;
    field:int common_pid;   offset:4;   size:4; signed:1;

    field:char prev_comm[16];   offset:8;   size:16;    signed:1;
    field:pid_t prev_pid;   offset:24;  size:4; signed:1;
    field:int prev_prio;    offset:28;  size:4; signed:1;
    field:long prev_state;  offset:32;  size:8; signed:1;
    field:char next_comm[16];   offset:40;  size:16;    signed:1;
    field:pid_t next_pid;   offset:56;  size:4; signed:1;
    field:int next_prio;    offset:60;  size:4; signed:1;
```

__Note:__ You need debugfs file system mounted on `/sys/kernel/debug` to play with these tracepoints.

```
$ mount -t debugfs nodev /sys/kernel/debug
```

Taking the example of sched/sched_switch event whose ID in my system is 312. It includes following steps:
* Setting up `perf_event_attr` structure.
* Calling `perf_event_open` to open event and get FD associated with it.
* Mapping the recieved FD with n number of pages to recieve sampling data.
* Polling on that FD to read sampling data.
* Reading the sampling data.

Data structure:

```
struct perf_event_thread {
        struct perf_event_open  e_open;
        struct mmap_pages       *mmap_pages;
        pthread_t               thread;
};

struct perf_event_open {
        struct  perf_event_attr attr;
        pid_t                   pid;
        int                     cpu;
        int                     group_id;
        unsigned long           flags;
        char                    *name;
};

struct mmap_pages {
        int                     n;
        int                     fd;
        struct perf_event_attr  attr;
        __u64                   mask;
        void                    *base;
        void                    *wrap_base;
        __u64                   read;
};
```

* Setting up `perf_event_attr`:

```
struct mmap_pages *
perf_event_create(struct perf_event_open *e_open)
{
    ....

        e_open->attr.disabled           = 1;
        e_open->attr.size               = sizeof(e_open->attr);
        e_open->attr.type               = PERF_TYPE_TRACEPOINT;
        e_open->attr.config             = 312;
        e_open->attr.sample_period      = 1;
        e_open->attr.sample_type        = PERF_SAMPLE_TIME      |
                                          PERF_SAMPLE_RAW       |
                                          PERF_SAMPLE_TID       |
                                          PERF_SAMPLE_STREAM_ID ;

    ....
}
```

`PERF_SAMPLE_RAW` enables the capturing on raw data of event enabled. The raw output is of format given in `tracing/events/sched/sched_switch/format`.

* Calling perf_event_open

```
struct mmap_pages *
perf_event_create(struct perf_event_open *e_open)
{
    int fd = -;
    ...

    fd = perf_event_open(&e_open->attr,e_open->pid,e_open->cpu      \
                                ,e_open->group_id,e_open->flags);

        ....

}
```

If pid is not -1 then it will capture events related to that particular PID. If CPU is not -1 it will enable sampling on that particular CPU. In my case both values will be -1.

* Mapping FD

```
struct mmap_pages {
        int                     n;
        int                     fd;
        struct perf_event_attr  attr;
        __u64                   mask;
        void                    *base;
        void                    *wrap_base;
        __u64                   read;
};

struct mmap_pages *mmap_pages__new(int fd,int n)
{
        int pages = two_to_the(n);
        int mmap_len = (pages + 2) * page_size;
        struct mmap_pages *mmap_pages = calloc(1,sizeof(*mmap_pages));
        mmap_pages->n           = n;
        mmap_pages->fd          = fd;
        mmap_pages->mask        = pages * page_size - 1;

        mmap_pages->wrap_base   = mmap(NULL, mmap_len,PROT_READ | PROT_WRITE, \
                                        MAP_PRIVATE | MAP_ANONYMOUS, fd, 0);

        mmap_pages->base        = mmap(mmap_pages->wrap_base + page_size,     \
                                        mmap_len - page_size, PROT_READ |     \
                                        PROT_WRITE, MAP_SHARED | MAP_FIXED,   \
                                        fd, 0);

        return mmap_pages->base == MAP_FAILED ? NULL : mmap_pages;
```

It will map 2^n+2 pages with the FD received from `perf_event_open` from which 2^n pages will be ring buffer to store sampling data. Normally 2^n+1 pages are mapped but used 1 page extra to handle truncated data at buffer's end when buffer gets full. First page will store the metadata which stores various bits of information including the head of ring-buffer.

* Polling on FD

```
struct output_records {
        struct buf_reader       reader;
        struct perf_event_attr  attr;
        FILE                    *file;
        int                     e_type;
};

void *perf_event_loop(void *arg)
{
        struct perf_event_thread *e_thread      = (struct perf_event_thread *)arg;
        struct mmap_pages        *mmap_pages    = e_thread->mmap_pages;
        struct pollfd            pollfd[]       = { {mmap_pages->fd, POLLIN, 0} ,        \
                                                    {wakeup.rd_fd, POLLIN | POLLHUP , 0} \
                                                  };

        struct output_records    out_records    = { {write_output},
                                                    e_thread->e_open.attr,
                                                    (FILE *)stdout
                                                  };

        while(!__sync_fetch_and_or(&wakeup.ctrlc,0)) {
                int ret = poll(pollfd, 2, -1);
                if(ret == -1) {
                        fprintf(stderr,"Failed to start poll");
                        continue;
                }
                mmap_pages_read(mmap_pages,&out_records.reader);
        }
}
```

`struct output_records` handles the parsing of data received which  includes function pointer of reader function and file pointer to which the final output will be recieved. And, reader `write_output` will be called from `mmap_pages_read` whenever there is something to read.

* Reading the sampling data

```
int mmap_pages_read(struct mmap_pages *mp,struct buf_reader *reader)
{
        __u64 head = mmap_pages__read_head(mp->base);
        unsigned char *data = (unsigned char *)mp->base + page_size;
        int size = 0;
        int nread = 0;
        int ret;
        int nleft = 0;

        void *buf = NULL;

        if(mp->read == head)
                return 0;

        // First read the full data records
        size = head - mp->read;
        if((mp->read & mp->mask) + size != (head & mp->mask) &&
                ((mp->read + size) &  mp->mask) != 0 ) {

                buf = &data[mp->read & mp->mask]; 
                size = mp->mask + 1 - (mp->read & mp->mask);
                nread = reader->read(buf,size,reader);
                if(nread < 0) {
                        ret = -1;
                        goto out;
                }
                mp->read += nread;
                nleft = size - nread;
                if((__u64)nleft >= page_size) {
                        fprintf(stderr,"Record too big, doesnt make sense\n");
                        ret = -1;
                        goto out;
                }
        }

        // Read the left over record data by copying truncated data
        // at the end of spare page so that we get complete record
        memcpy(data - nleft,data + (mp->read & mp->mask), nleft);
        buf = &data[(mp->read + nleft) & mp->mask] - nleft;
        size = head - mp->read;
        nread = reader->read(buf,size,reader);
        mp->read += nread;
        ret = nread;

    out:
            return ret;
}
```
It will pass correct buffer pointer with size of data to read to the reader.

```
__u64 write_output(void *buf, __u64 size, struct output_records *out)
{
    int nread = 0;
        struct perf_event_attr attr = out->attr;
        while(nread < size) {

                struct perf_event_header *header = buf;
                void *sample = (void *)(header + 1);

                if(nread + header->size > size)
                        break;

                switch(header->type) {

        case PERF_RECORD_SAMPLE:

        ....

        if(attr.sample_type & PERF_SAMPLE_RAW) {
                                        struct perf_record_sample_raw *raw = sample;
                                        int i;
                                        struct sched_switch *swtch = (
                        struct sched_switch *)raw->data;
                                        fprintf(out->file,"PrevPID: %d PrevComm: %s
                        NextComm: %s NextPID:%d\n",
                                                swtch->prev_pid,
                                                swtch->prev_comm,
                                                swtch->next_comm,
                                                swtch->next_pid);

                                        fprintf(out->file,"\n");
                                        sample += sizeof(*raw);
                                }
        };

        ....

        nread += header->size;
                buf   += header->size;
    }
    return nread;
}
```

* Finally the output

```
TID: 2362, PID: 2362
TIME: 8615036210680712
PrevPID: 2362 PrevComm: perf-prof NextComm: swapper/7 NextPID:0

TID: 0, PID: 0
TIME: 8615036220893836
PrevPID: 0 PrevComm: swapper/7 NextComm: ksoftirqd/7 NextPID:43

TID: 43, PID: 43
TIME: 8615036220899347
PrevPID: 43 PrevComm: ksoftirqd/7 NextComm: swapper/7 NextPID:0

TID: 0, PID: 0
TIME: 8615036308810259
PrevPID: 0 PrevComm: swapper/7 NextComm: iostat NextPID:2320

TID: 2320, PID: 2320
TIME: 8615036309439058
PrevPID: 2320 PrevComm: iostat NextComm: swapper/7 NextPID:0
```

See complete source [here](https://github.com/SahilAggarwal/perf)