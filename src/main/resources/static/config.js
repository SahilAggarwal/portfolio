CONFIG = {
    portfolio: {
        introduction: {
            name: {
                first: "Sahil",
                last: "Aggarwal"
            },
            address: "Bangalore, India.",
            email: "sahil.agg15@gmail.com",
            intro: "Tech enthusiast. I use this space to dump all new interesting things i learn mostly for my own reference :)",
            socials: [
                     {
                        link: "https://www.facebook.com/sahil.aggarwal15",
                        faIcon: "fa-facebook"
                     },
                     {
                        link: "https://www.linkedin.com/in/sahilagg15",
                        faIcon: "fa-linkedin"
                     },
                     {
                        link: "https://github.com/SahilAggarwal",
                        faIcon: "fa-github"
                     }
                ]
            }
        },
        blog: {
            posts: {
                // this key name should be same as the .md file blogs/. for eg blogs/adding-tracepoints.md
                "adding-tracepoints": {
                    date: "6th Sept, 2015",
                    title: "Tracepoints in Ftrace",
                    info: "Adding custom tracepoints in Ftrace",
                },
                "perf-api": {
                    date: "15th Aug, 2015",
                    title: "Profiler using perf_event_open",
                    info: "Writing your own system profiler using perf_even_open syscall",
                },
                "gcp-portfolio": {
                    date: "24th Mar, 2018",
                    title: "Deploy blog on GCP in 10 mins",
                    info: "Brief steps to create your portfolio and deploy in GCP",
                },
                "mmdb": {
                    date: "12th May, 2018",
                    title: "Paper: Main Memory Database Systems",
                    info: "Abridged notes on paper on Main Memory DB",
                }

            }
        }
    }
