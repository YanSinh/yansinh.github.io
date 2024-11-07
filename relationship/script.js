// Load saved data and display it on page load
window.onload = function() {
    const savedData = JSON.parse(localStorage.getItem('savedData')) || [];
    savedData.forEach(entry => displaySavedInfo(entry.id, entry.name, entry.date, entry.timeUnit));
};

// Function to auto-format date as D/M/Y while typing
document.getElementById('dateInput').addEventListener('input', function(e) {
    let input = e.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    if (input.length >= 2) input = input.slice(0, 2) + '/' + input.slice(2); // Insert first slash
    if (input.length >= 5) input = input.slice(0, 5) + '/' + input.slice(5); // Insert second slash
    e.target.value = input.slice(0, 10); // Limit to DD/MM/YYYY format
});

// Save name, date, and time unit to local storage, then display "time ago"
function saveData() {
    const name = document.getElementById('nameInput').value.trim();
    const dateInput = document.getElementById('dateInput').value;
    const timeUnit = document.getElementById('timeUnit').value;

    if (!name) {
        alert("សូមបញ្ចូលឈ្មោះ។");
        return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
        alert("សូមបញ្ចូលកាលបរិច្ឆេទក្នុងទម្រង់ DD/MM/YYYY។");
        return;
    }
    
    const savedData = JSON.parse(localStorage.getItem('savedData')) || [];
    const newEntry = { id: Date.now(), name, date: dateInput, timeUnit }; // Add unique ID
    savedData.push(newEntry);
    localStorage.setItem('savedData', JSON.stringify(savedData));
    
    displaySavedInfo(newEntry.id, name, dateInput, timeUnit);
    document.getElementById('nameInput').value = '';
    document.getElementById('dateInput').value = '';
}

// Display saved info with chosen "time ago" unit and a trash icon
function displaySavedInfo(id, name, date, timeUnit) {
    const savedInfoContainer = document.getElementById('savedInfoContainer');
    savedInfoContainer.querySelector('p')?.remove(); // Remove placeholder text

    const entryDiv = document.createElement('div');
    entryDiv.classList.add('entry');

    const entryTimeAgo = calculateTimeAgo(date, timeUnit);
    entryDiv.innerHTML = `${name} <span class="time-ago">${entryTimeAgo} ${timeUnit} កន្លងទៅ</span>`;

    const trashButton = document.createElement('button');
    trashButton.classList.add('trash-icon');
    trashButton.innerHTML = '🗑️';
    trashButton.onclick = () => {
        if (confirm(`តើអ្នកចង់លុបធាតុរបស់ ${name} ទេ?`)) {
            removeData(id);
        }
    };

    entryDiv.appendChild(trashButton);
    savedInfoContainer.appendChild(entryDiv);
}

// Remove an entry from localStorage and update display
function removeData(id) {
    let savedData = JSON.parse(localStorage.getItem('savedData')) || [];
    savedData = savedData.filter(entry => entry.id !== id); // Remove entry by ID
    localStorage.setItem('savedData', JSON.stringify(savedData));

    const savedInfoContainer = document.getElementById('savedInfoContainer');
    savedInfoContainer.innerHTML = ""; // Clear current display
    savedData.forEach(entry => displaySavedInfo(entry.id, entry.name, entry.date, entry.timeUnit));
}

// Calculate "time ago" based on the chosen unit in Khmer
function calculateTimeAgo(savedDate, timeUnit) {
    const [day, month, year] = savedDate.split('/').map(Number);
    const savedDateObj = new Date(year, month - 1, day);
    const currentDate = new Date();

    const timeDiff = currentDate - savedDateObj;
    let timeAgo = '';

    if (timeUnit === "days") {
        timeAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); // Days
        return `${timeAgo} ថ្ងៃ`;
    } else if (timeUnit === "months") {
        const months = (currentDate.getFullYear() - savedDateObj.getFullYear()) * 12 
                       + (currentDate.getMonth() - savedDateObj.getMonth());
        return `${months} ខែ`;
    } else if (timeUnit === "years") {
        const years = currentDate.getFullYear() - savedDateObj.getFullYear();
        return `${years} ឆ្នាំ`;
    }
}

