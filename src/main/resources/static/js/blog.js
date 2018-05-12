function filter() {
   var input, filter, blogs, heading, i;
   input = document.getElementById("search");
   filter = input.value.toUpperCase();
   blogs = document.getElementById("blogList").getElementsByTagName("a");
   for (i = 0; i < blogs.length; i++) {
       heading = blogs[i].getElementsByTagName("h5")[0];
       info = blogs[i].getElementsByTagName("p")[0];
       if (heading.innerHTML.toUpperCase().indexOf(filter) > -1 || info.innerHTML.toUpperCase().indexOf(filter) > -1) {
           blogs[i].style.display = "";
       } else {
           blogs[i].style.display = "none";
       }
   }
}

var converter = new showdown.Converter({tables: true});
var baseDir = "/blogs";
function load(blogName) {
   var path = baseDir + "/" + blogName + ".md";
   $.ajax({
       url: path,
       success: function(data) {
           $("#postMain").html(converter.makeHtml(data));
       },
       error: function() {
           $("#postMain").html(converter.makeHtml("## Not Found"));
       }
   })
}