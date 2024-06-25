// Processing the config file
document.addEventListener("DOMContentLoaded", function () {
  
    document.getElementById("formButton").addEventListener(
      "click", async function () {
        chrome.tabs.create({url : "Frontend/form.html"});
      }
    )
})