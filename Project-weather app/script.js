const apiKey = "1f86ccc20a8ca9f83852f18aae0b9137";
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherInfo = document.getElementById("weatherInfo");

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city === "") {
    showMessage("⚠️ Please enter a city name!");
    return;
  }
  getWeather(city);
});

async function getWeather(city) {
  showMessage("⏳ Fetching weather data...");
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      showMessage("❌ City not found! Try again.");
      throw new Error("City not found");
    }

    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    showMessage("⚠️ Unable to fetch weather. Please try again later.");
    console.error("Error fetching weather:", error);
  }
}

function displayWeather(data) {
  weatherInfo.style.display = "block";

  document.getElementById("cityName").textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById("temp").textContent = `🌡️ Temperature: ${data.main.temp}°C`;
  document.getElementById("description").textContent = `☁️ Condition: ${data.weather[0].description}`;
  document.getElementById("humidity").textContent = `💧 Humidity: ${data.main.humidity}%`;
  document.getElementById("wind").textContent = `🌬️ Wind Speed: ${data.wind.speed} m/s`;
}

function showMessage(message) {
  weatherInfo.style.display = "block";
  weatherInfo.innerHTML = `<p style="font-size:18px;">${message}</p>`;
}
