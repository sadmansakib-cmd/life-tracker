const categories = ['health', 'work', 'learning'];
let dailyData = JSON.parse(localStorage.getItem('dailyData')) || { health: 0, work: 0, learning: 0 };
let monthlyLogs = JSON.parse(localStorage.getItem('monthlyLogs')) || [];

window.onload = () => {
    checkMidnightReset();
    updateAllUI();
};

function checkMidnightReset() {
    const lastSavedDate = localStorage.getItem('lastSavedDate');
    const currentDate = new Date().toLocaleDateString();

    if (lastSavedDate && lastSavedDate !== currentDate) {
        monthlyLogs.push({
            date: lastSavedDate,
            data: { ...dailyData },
            overall: calculateOverall()
        });
        localStorage.setItem('monthlyLogs', JSON.stringify(monthlyLogs));

        categories.forEach(cat => dailyData[cat] = 0);
        localStorage.setItem('dailyData', JSON.stringify(dailyData));
    }
    
    localStorage.setItem('lastSavedDate', currentDate);
}

function updateCategory(cat) {
    const inputElement = document.getElementById(`input-${cat}`);
    let rating = parseFloat(inputElement.value);

    if (isNaN(rating) || rating < 0 || rating > 10) {
        alert("Please enter a valid rating between 0 and 10.");
        return;
    }

    dailyData[cat] = (rating / 10) * 100;
    localStorage.setItem('dailyData', JSON.stringify(dailyData));
    inputElement.value = '';
    
    updateAllUI();
}

function calculateOverall() {
    let total = 0;
    categories.forEach(cat => {
        total += dailyData[cat];
    });
    return total / categories.length;
}

function updateAllUI() {
    categories.forEach(cat => {
        setCircleProgress(`ring-${cat}`, dailyData[cat]);
        document.getElementById(`perc-${cat}`).innerText = `${Math.round(dailyData[cat])}%`;
    });

    const overall = calculateOverall();
    setCircleProgress('ring-overall', overall);
    document.getElementById('perc-overall').innerText = `${Math.round(overall)}%`;
}

function setCircleProgress(elementId, percent) {
    const circle = document.getElementById(elementId);
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function showMonthlyLogs() {
    console.log("Monthly Logs Data:", monthlyLogs);
    alert("Monthly logs printed in browser console! Press F12 to view.");
}