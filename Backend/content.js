// content.js => where the query selection is done
// Content scripts are js files that run in the context of webpages
// By using a standard Document Object Model (DOM), they can read details on the webpages the browser visits, or make changes to them.

let listenersRegistered = false;
let chatLogClicked = false;
let textFileClicked = false;
let scrolled = false;
var $ = jQuery = window.jQuery;
const scrollAmount = 2000;
const maxAttempts = 3;
const storageElements = ["jsonData", "rowIndex", "currentPage", "startDateString", "endDateString"];

// Main calling function
if (!listenersRegistered) {
  listenersRegistered = true;

  // Create a set to track executed actions
  var executedActions = new Set();

  // Listener for messages sent from background script
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    
    var arr = [...executedActions];
    console.log(`Current executed actions set : ${arr}`);

    if (message.from === "background.js") {
      
      let configData, rowIndex;

      if (message.action === "findChatLogs" && !executedActions.has(message.action)) {

        executedActions.add(message.action); // Mark the action as executed
        await delay(1000);

        /* 
        Within the Notes webpage, iterate and find a chat log to click into based on 2 selectors:
          - aria-colindex : constant value of 2
          - aria-rowindex : iterates from 2 - 51

        => Max row index that can be downloaded without scrolling : 25
        */

        // Get the saved data in chrome.storage
        chrome.storage.sync.get(storageElements, async (data) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          } else {
            configData = data.jsonData;
            rowIndex = data.rowIndex;
            currentPage = data.currentPage;
            startDate = new Date(await castStringToDate(data.startDateString));
            endDate = new Date(await castStringToDate(data.endDateString));
            
            const foundPageNumber = await findPageNumber(configData);

            await delay();

            console.log(`Current Page: ${currentPage} vs Found Page: ${foundPageNumber}`);

            if (currentPage == foundPageNumber) {  // Current Page must be correct
              if (rowIndex < 52) { 
                console.log(`Row Index is: ${rowIndex}`);        

                // Flag to check if double click on the chat log has executed
                if (!chatLogClicked) { 
                  await delay(3000);
                  chatLogClicked = true;
                
                  executedActions = await findChatLog(data, executedActions, message, 0, maxAttempts, scrolled);
                }
              }

              else {
                console.log("Going to next page");
                await delay();

                [executedActions, rowIndex, chatLogClicked, scrolled, currentPage] = await findNextPageandReset(configData, executedActions, rowIndex, chatLogClicked, scrolled, currentPage);
                
              }
            } // END OF IF 

          else if (currentPage > foundPageNumber) {
            // Need to click the next page
            console.log("Wrong page reached");
            await delay();
            executedActions = await findNextPageNav(configData, executedActions);
            
          }
          }
        });
      }

      // Finding the txt file aria label
      else if (message.action === "findTxtFile" && !executedActions.has(message.messageId)) {

        executedActions.add(message.messageId); // Adding generated message id for txt file

        console.log(`Find txt file message action: ${message.action}`)

        executedActions = await findTxtFile(executedActions, message);
      }
    }
  });
}