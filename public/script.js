async function fetchLeaderboardData() {
  try {
    const response = await fetch('/api/scrape-leaderboard');
    const data = await response.json();
    updateTable('race-mode-data', data.raceMode);
    updateTable('three-lap-data', data.threeLap);
  } catch (error) {
    console.error('Error fetching data:', error);
    alert('Error al cargar los datos. Revisa la consola para más detalles.');
  }
}

function updateTable(tableId, data) {
  const tableBody = document.getElementById(tableId);
  tableBody.innerHTML = data.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${row.pilot}</td>
      <td>${row.time}</td>
    </tr>
  `).join('');
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', fetchLeaderboardData);

// Botón de actualización
document.getElementById('refresh-btn').addEventListener('click', fetchLeaderboardData);