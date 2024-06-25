// Helper function for casting String date into Date Object
async function castStringToDate(dateString) {
    const dateParts = await dateString.split(/\s+/); // Split by whitespace
    const extractedDate = await dateParts[0]; // Get the first element
  
    const [day, month, year] = await extractedDate.split('/');
  
    // Convert the string components into numbers (as expected by Date constructor)
    const dayNumber = parseInt(day, 10);
    const monthNumber = parseInt(month, 10) - 1; // Subtracting 1 to match standard 0-11 range
    const yearNumber = parseInt(year, 10);
  
    // Create a Date object from the components and set the time to midnight (00:00:00)
    const dateObject = new Date(yearNumber, monthNumber, dayNumber);
    dateObject.setHours(0, 0, 0, 0);
    return dateObject;
  }
  
// Helper function to check if the chat log date is within the specified date range
function compareDates(dateToCompare, startDate, endDate) {
  /*
    In JS:
      If dateObj_1 < dateObj_2 
        => dateObj_1 occurs before dateObj_2
      If dateObj_1 > dateObj_2
        => dateObj_1 occurs after dateObj_2
  */

  if (dateToCompare >= startDate && dateToCompare <= endDate) { 
    return 1; // If chat log date is within the range of the dates
  }
  else if (dateToCompare < startDate) {
    return 0; // If the dateToCompare occurs before startDate
  }
  return -1; // If dateToCompare is not within the range but not before the startDate, so we need to continue searching
};