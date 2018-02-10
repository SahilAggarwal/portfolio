

Ftrace comes with many static tracepoints out of the box but sometime we may want tracepoint which is not already there and we have to enable dynamic tracepoints. But since this is not a portable aproach as function name may not be same forever, therefore to make ourprofiling script kernel independent it is preferred to use only tracepoints visible in ftrace i.e static tracepoints. The tracepoint can be added in ftrace source in kernel, and patch can be submitted for same to add them to the mainstream to make them static.

Taking example to add `mm_page_swap_in/mm_page_swap_out`.

**mm\_page\_swap\_in:** Called whenever page is swapped in from swap area. The "ret" value can be used to compare if page was added from swap cache(minor fault) or from lower level swap area(major fault), which can
be useful in profiling the performance degradation due to swapping

**mm\_page\_swap\_out:** Called whenever page is swapped out to swap area

It requires 2 steps:
 
* Declaring the tracepoint: Since these are memory related events and some of the memory related events are already available in `/sys/kernel/debug/tracing/events/kmem`. I will add `mm_page_swap_in` in the same directory i.e kmem.

    Before declaring tracepoint, we need to look into the function where this tracepoint will be inserted to see what fields are visible in the function which can be passed to the tracepoint and captured. For eg: here i am passing struct page *, int to my tracepoint.

    `/include/trace/events/kmem.h` holds the declaration of events related to kmem. I will add `mm_page_swap_in/mm_page_swap_out` in the same file. The declaration format is:

    ```  
    TRACE_EVENT(mm_page_swap_out,           // Tracepoint name

     TP_PROTO(struct page *page, int ret),  // args this tracepoint will accept

     TP_ARGS(page, ret),

     TP_STRUCT__entry(
     __field( unsigned long, pfn )        // tracepoint specific structure, same as
         __field( int, ret )          // format structure in event's format file.
    ),

    TP_fast_assign(
    __entry->pfn = page_to_pfn(page);        // assigning value to the tracepoint struct
    __entry->ret = ret;
    ),

    TP_printk("page=%p pfn=%lu ret=%d",  // Print function called
    pfn_to_page(__entry->pfn),
    __entry->pfn,
    __entry->ret)

    );
    ```

    This will create the function `trace_mm_page_fault(struct page*, int)`, which can be inserted wherever we want to put our tracepoint.

* Putting that tracepoint in appropriate place required `add_to_swap(struct page *page, struct list_head *list)` is the function called when page is added to the swap area. So to put the declared tracepoint :
    
    ```
    int add_to_swap(struct page *page, struct list_head *list) {
           ..... 
           trace_mm_page_swap_out(page,ret)
       }
   
    ```
   Now, after recompiling the kernel and mounting debugfs, we can see our tracepoint in ftrace:
   
    ```
   /sys/kernel/debug/tracing/events/kmem/mm_page_swap_out
   /sys/kernel/debug/tracing/events/kmem/mm_page_swap_out/id
   /sys/kernel/debug/tracing/events/kmem/mm_page_swap_out/format
   /sys/kernel/debug/tracing/events/kmem/mm_page_swap_out/filter
   /sys/kernel/debug/tracing/events/kmem/mm_page_swap_out/enable
    ```   
    Similarly, we can add tracepoint for `mm_page_swap_in` which can be added in function `static int do_swap_page(...)` in `mm/memory.c`.