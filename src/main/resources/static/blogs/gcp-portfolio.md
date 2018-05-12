
Even though [google's doc](https://cloud.google.com/appengine/docs/standard/java/quickstart) is really good, it took me quite some time to get it working :) 

* Create app in google cloud console.  

* Install gcloud utility: CLI based utility for google cloud. [[doc](https://cloud.google.com/sdk/downloads)]  

* Initialize your account:   
~ `gcloud init` : Will authenticate and get the list of app created in the account. Select the app created in Step-1.  

* Install java app engine: Install the java app extensions  
~  `gcloud components install app-engine-java`  

* Fork the [portfolio repo](https://github.com/SahilAggarwal/portfolio) and add your content.  

* Configure the app in ```src/main/webapp/WEB-INF/appengine-web.xml```  

* Test app on local  
~ `mvn spring-boot:run`  

* Deploy the application  
~ `mvn appengine:update -DskipTests  -e`  

Application will be hosted on `http://$appName.appspot.com`.