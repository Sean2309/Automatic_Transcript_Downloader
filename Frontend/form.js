// Function to clear data from Chrome storage
function clearStorageData() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.clear(function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Data cleared from Chrome storage.');
        resolve();
      }
    });
  });
};

// Helper function to handle date formatting
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

// Function to parse date input based on timeframe
function parseDateInput(timeframeDate) {
  let endDate = new Date();
  let startDate = new Date();
  const oneDay = 24 * 60 * 60 * 1000; // Number of milliseconds in one day

  if (timeframeDate === "1day") {
    startDate = new Date();  // add this part : endDate.getTime() - oneDay after testing is done
    // endDate = new Date(startDate.getTime() + oneDay); // remove this after testing
    // startDate = endDate;
  } else if (timeframeDate === "1week") {
    startDate = new Date(endDate.getTime() - (7 * oneDay));
  } else if (timeframeDate === "1month") {
    startDate = new Date(endDate.getTime() - (30 * oneDay));
  } else if (timeframeDate === "custom") {
    console.log("Custom time range selected");
    const startDateInput = document.getElementById("startdate").value;
    const endDateInput = document.getElementById("enddate").value;

    startDate = new Date(startDateInput);
    endDate = new Date(endDateInput);

    // Ensure start date is before end date
    if (startDate > endDate) {
      console.error("Start date cannot be after end date.");
      return; // Stop further processing
    }
  }

  return [formatDate(startDate), formatDate(endDate)];
}

// Processing the config file
document.addEventListener("DOMContentLoaded", function() {
  const startDownloadButton = document.getElementById("startDownload");

  startDownloadButton.addEventListener("click", async function() {
    // Clearing the data in the Chrome storage first
    await clearStorageData();

    const configFileInput = document.getElementById("inputConfigFile");
    const configFile = configFileInput.files[0];
    const outputDiv = document.getElementById("output");
    const [startDateString, endDateString] = parseDateInput(document.getElementById("timeframe").value);
    console.log(`Start date : ${startDateString}, End Date : ${endDateString}`)

    if (configFile) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        const configContent = e.target.result;

        try {
          // Process the config content as JavaScript code
          const jsonData = await JSON.parse(configContent);

          // Store the parsed JSON data in chrome.storage
          chrome.storage.sync.set({
            jsonData: jsonData,
            rowIndex: 2,
            currentPage: 1,
            startDateString: startDateString,
            endDateString: endDateString
          }, function() {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError);
            } else {
              outputDiv.textContent = "Chrome storage has been initialized";
            }
          });

          // Start the download process
          await chrome.runtime.sendMessage({ action: "startDownload", from: "popup.js" });

        } catch (error) {
          console.error("Error processing config file:", error);
        }
      };

      reader.readAsText(configFile);
    }
  });

  const timeframeSelect = document.getElementById("timeframe");
  const customDateDiv = document.getElementById("customDate");

  timeframeSelect.addEventListener("change", function() {
    const selectedOption = timeframeSelect.value;

    if (selectedOption === "custom") {
      customDateDiv.style.display = "block"; // Show custom date input
    } else {
      customDateDiv.style.display = "none"; // Hide custom date input
    }
  });
});
