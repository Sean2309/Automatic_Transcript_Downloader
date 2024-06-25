/*
Flow of Web Navigation:
1) Notes => same throughout
2) Sample ID 1/2 => potentially has a pattern but not sure yet
3) ID for txt file => same throughout
*/
let listener;
let listenersRegistered = false;
// Create a set to track executed actions
const executedActions = new Set();
const storageElements = ["jsonData", "rowIndex", "currentPage", "startDateString", "endDateString"];
let filesDownloaded = 0;

// Main calling function
if (!listenersRegistered) {
  listenersRegistered = true;

  // Listener for messages sent from popup and content scripts
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log(`Message received in background.js: ${message.action}`);
    if (message.action === "startDownload" && message.from === "popup.js" && !executedActions.has(message.action)) {
      executedActions.add(message.action); // Mark the action as executed
      // Initial Navigation into the Notes CRM Webpage
      chrome.storage.sync.get(storageElements
        , async (data) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          configData = data.jsonData;
          rowIndex = data.rowIndex || 2;
          currentPage = data.currentPage || 1;

          const baseURL = configData.baseURL;
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const currTabURL = tabs[0].url;

          if (baseURL === currTabURL) {
            console.log("Base URL matches");

            chrome.tabs.sendMessage(tabs[0].id, { action: "findChatLogs", from: "background.js" });
          } else {
            console.log("Base URL does not match");
            chrome.tabs.update(tabs[0].id, { url: baseURL }, () => {
              // delay(3000);
              function onCompletedListener(details) {
                if (details.tabId === tabs[0].id) {
                  chrome.tabs.sendMessage(tabs[0].id, { 
                    action: "findChatLogs", 
                    from: "background.js" 
                  });
                  chrome.webNavigation.onCompleted.removeListener(listener);
                }
              }
              chrome.webNavigation.onCompleted.addListener(onCompletedListener);
            });
          }
        }
      });
    } else if (message.action === "doubleClickComplete" && message.from === "content.js" && !executedActions.has(message.action)) {
      executedActions.add(message.action); // Mark the action as executed

      // delay(); 

      // Check that the web navigation into each chat log page is done
      chrome.webNavigation.onCompleted.addListener((details) => {
        chrome.tabs.sendMessage(details.tabId, { 
          action: "findTxtFile", 
          from: "background.js", 
          messageId: message.rowId 
        });

        // Removing the executed action after it's done
        executedActions.delete(message.action);
      });
    } else if (message.action === "txtFileClickComplete" && message.from === "content.js" && !executedActions.has(message.action)) {
      executedActions.add(message.action); // Mark the action as executed

      // delay();

      // Check for click to download the transcript txt file
      // Sends a message back to content js to notify the completion
      chrome.storage.sync.get(storageElements
        , (data) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          configData = data.jsonData;
          rowIndex = data.rowIndex;
          rowIndex = rowIndex + 21; // For testing purposes

          // rowIndex++;
          filesDownloaded++;

          chrome.storage.sync.set({ rowIndex: rowIndex }, () => {

            console.log(`+1 added to row index, navNeeded : ${message.navNeeded}`);

            if (message.navNeeded) {
              chrome.tabs.update(sender.tab.id, { url:  configData.baseURL }, () => {
              function onCompletedListener(details) {
                if (details.tabId === sender.tab.id) {
                  chrome.tabs.sendMessage(sender.tab.id, { 
                    action: "findChatLogs", 
                    from: "background.js" 
                  });
                  chrome.webNavigation.onCompleted.removeListener(listener);
                }
              }
              chrome.webNavigation.onCompleted.addListener(onCompletedListener);
            });
          }
          else {
            console.log(`Nav not needed. Simply sending findChatLogs message to content.js`)
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "findChatLogs", 
              from: "background.js" 
            });
          }

            // Removing the executed action after it's done
            executedActions.delete(message.action);
          });
        }
      });
    } 
    
    else if ( message.action === "nextPageClickComplete" && message.from === "content.js" ) {
      console.log("Next Page clicked in content.js");
      executedActions.add(message.action); // Mark the action as executed
      
      await // delay();

      // Check that the web navigation into each chat log page is done
      chrome.tabs.sendMessage(sender.tab.id, {
        action : "findChatLogs",
        from : "background.js"
      })
      console.log("Sent next page done to content.js");
      executedActions.delete(message.action);

    }
    
    else if (message.action === "allPagesTraversed" && message.from === "content.js") {
      console.log(`Downloads done! Number of files downloaded : ${filesDownloaded}`);
    }
  });
}

