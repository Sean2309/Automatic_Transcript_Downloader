// Find the Page Number of the Current Page
const findPageNumber = async (
  configData
) => {
    return new Promise(async (resolve) => {
      let pageFindAttempt = 0;
      let pageNumber;
  
      const getPageNumber = async () => {
        pageFindAttempt++;
        await delay();
        const pageNumberText = await $(configData.pageNumberLabel).text();
        if (pageNumberText) {
          pageNumber = parseInt(pageNumberText.charAt(pageNumberText.length - 1));
          resolve(pageNumber);
        } else {
          if (pageFindAttempt < 100) { // Set a limit to prevent indefinite attempts
            await delay();
            await getPageNumber();
          } else {
            resolve(undefined); // Return undefined after a certain number of attempts
          }
        }
      };
  
      await getPageNumber();
    });
  };


// Find the Chat Log based on aria-colindex and aria-rowindex
const findChatLog = async (
  data, 
  executedActions, 
  message,
  attemptsToFindChatLog,
  maxAttempts, 
  scrolled,
) => {
    let chatLogSelector = `div[aria-rowindex="${data.rowIndex}"] [aria-colindex="2"]`;
    var chatLog = $(chatLogSelector);
      if (chatLog.length > 0) {
        let chatDate = chatLog.text().trim();
        console.log(`Chat Date : ${chatDate},   Start Date : ${data.startDateString},  End Date : ${data.endDateString}`);
        let dateToCompare = await castStringToDate(chatDate);
  
        await delay();
        let compareDatesBool = compareDates(dateToCompare, startDate, endDate);
        if ( compareDatesBool == 1) {
          console.log(`Chat log date is within the specified range`);
          let rowId = chatLog.parents('[row-id]').attr('row-id');
          let doubleClickEvent = new MouseEvent('dblclick', {
            bubbles: true,  
            cancelable: true,
            view: window,
          });
  
          // Executing double click
          chatLog[0].dispatchEvent(doubleClickEvent);
        
          // Send message to background.js
          chrome.runtime.sendMessage({
            action: "doubleClickComplete",
            from: "content.js",
            rowId : rowId
          });
          chatLogClicked = false; // Reset double click executed flag
  
          attemptsToFindChatLog = 0;
  
          // Deleting the executed action
          executedActions.delete(message.action);
        }

        else if (compareDatesBool == -1) {
          console.log(`Chat log doesnt fall within the range but search will continue`);
          await delay();
          
          // Deleting the executed action
          executedActions.delete(message.action);
          chatLogClicked = false;

          // Send message to background.js
          chrome.runtime.sendMessage({
            action: "txtFileClickComplete", 
            from: "content.js",
            navNeeded : false
          });
        }
  
        else if (compareDatesBool == 0) {
          console.log(`Chat log date occurs before the start date. Search will stop`);
          // attemptsToFindChatLog = 0;
          await delay();
          // Send message to background.js
          chrome.runtime.sendMessage({
            action: "allPagesTraversed", 
            from: "content.js"
          });
        }
      } 
    else { // This else clause is to account for DOM not completely loading in the webpage, resulting in the chat log not being found
      attemptsToFindChatLog++;
      if (attemptsToFindChatLog <= maxAttempts && !scrolled) {
        await delay(500);
        await findChatLog(data, executedActions, message, attemptsToFindChatLog, maxAttempts, scrolled);
      }
      else if (attemptsToFindChatLog > maxAttempts && !scrolled) {
        // Max attempts to find chat log reached => proceed to window scrolling
        console.log("Max attempts to find chat log reached, scrolling window");
  
        await delay();
        var $viewport = $(configData.viewportLabel);
        if ($viewport.length > 0) {
          $viewport.animate({ scrollTop : scrollAmount}, 0);
          console.log("Scrolling is done");
        }
        else {
          console.log("Viewport not found");
        };
  
        scrolled = true;
        attemptsToFindChatLog = 0;
        await delay(1000);
        await findChatLog(data, executedActions, message, attemptsToFindChatLog, maxAttempts, scrolled);
      }
    }

    return executedActions;
  }


// Function to find the next page and reset values
const findNextPageandReset = async (
  configData, 
  executedActions, 
  rowIndex, 
  chatLogClicked, 
  scrolled, 
  currentPage
) => {
  let nextPage = $(configData.nextPageAriaLabel);
  if (nextPage.length > 0) {
    nextPage[0].click();
    currentPage++;

    // Reset the variables
    executedActions.clear(); // Clear the set of executed actions
    rowIndex = 2; // Reset the row index
    chatLogClicked = false; // Reset the double click flag
    scrolled = false; // Reset the scrolled flag

    chrome.storage.sync.set({ "rowIndex": rowIndex, "currentPage" : currentPage }, () => {
      console.log(`New values - Row Index : ${rowIndex} , Page : ${currentPage}`);
    });
    await delay(5000);
    chrome.runtime.sendMessage({
      action: "nextPageClickComplete",
      from: "content.js"
    });
  }

  return [executedActions, rowIndex, chatLogClicked, scrolled, currentPage];
};

// Function to navigate to next page if wrong page is reached
const findNextPageNav = async (
  configData, 
  executedActions
) => {
  let nextPage = $(configData.nextPageAriaLabel);
  if (nextPage.length > 0) {
    nextPage[0].click();
  }
  executedActions.delete("findChatLogs");
  await delay(1000);
  chrome.runtime.sendMessage({
    action: "nextPageClickComplete",
    from: "content.js"
  });


  return executedActions;
}

// Function to find the text file 
const findTxtFile = async (
  executedActions, 
  message
) => {
    // Get the saved data in chrome.storage
    chrome.storage.sync.get(storageElements, async (data) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } 
        else {
          configData = data.jsonData;
          rowIndex = data.rowIndex;

          var textFile = $(configData.txtFileAriaLabel);

          if (!textFileClicked && textFile.length > 0) {
            textFileClicked = true;
            await delay();
            
            console.log(`Current rowIdx : ${rowIndex}, textFile bool : ${textFileClicked}`);

            await textFile[0].click();
            console.log("Chat Transcript Clicked");

            // Send message to background.js
            chrome.runtime.sendMessage({
              action: "txtFileClickComplete", 
              from: "content.js",
              navNeeded : true
            });
            
            textFileClicked = false;
            executedActions.delete(message.messageId); // Deleting messageId from the executedActions set
            await delay();
          }

          else {
            console.log("Text file clicked already");
          }    
        }
      }
    );

    return executedActions;
}