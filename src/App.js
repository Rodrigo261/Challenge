import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaSearch, 
  FaThermometerHalf, 
  FaCloudSun, 
  FaMapMarkerAlt, 
  FaCloudRain, 
  FaSun, 
  FaCloud, 
  FaSnowflake 
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import './styles.css';

const API_KEY = '169e08953a55472f5953cd96b68237b5';
const API_URL_WEATHER = 'https://api.openweathermap.org/data/2.5/weather';
const API_URL_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
const HEATMAP_RADIUS = 25; // Raio do heatmap (ajuste conforme necessário)

// Configuração do ícone do marcador do Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Função para determinar a cor com base na temperatura
const getTemperatureColor = (temp) => {
  if (temp <= 4) return 'bg-blue-200';     // 4°C ou menos: Azul claro
  if (temp > 4 && temp <= 8) return 'bg-yellow-200'; // 4°C a 8°C: Amarelo claro
  if (temp > 8 && temp <= 12) return 'bg-orange-200'; // 8°C a 12°C: Laranja claro
  return 'bg-red-200'; // 12°C ou mais: Vermelho claro
};

// Componente do Mapa com Heatmap
const TemperatureMap = ({ city, temperatureData }) => {
  useEffect(() => {
    if (temperatureData && temperatureData.length > 0) {
      const map = L.map('map').setView([city.coord.lat, city.coord.lon], 8); // Zoom inicial ajustado

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Adiciona o heatmap com cores baseadas nos intervalos de temperatura
      const heatmapLayer = L.heatLayer(
        temperatureData.map(point => [point.lat, point.lon, point.temp]),
        {
          radius: HEATMAP_RADIUS,
          gradient: {
            0.0: 'blue',    // 4°C ou menos: Azul
            0.3: 'yellow',  // 4°C a 8°C: Amarelo
            0.6: 'orange',  // 8°C a 12°C: Laranja
            1.0: 'red'      // 12°C ou mais: Vermelho
          },
          max: Math.max(...temperatureData.map(point => point.temp)), // Define o valor máximo para o heatmap
          min: Math.min(...temperatureData.map(point => point.temp)), // Define o valor mínimo para o heatmap
        }
      ).addTo(map);

      // Adiciona um marcador para a cidade
      L.marker([city.coord.lat, city.coord.lon], { icon }).addTo(map)
        .bindPopup(`<strong>${city.name}</strong><br>Temperature: ${temperatureData[0].temp.toFixed(1)}°C`)
        .openPopup();

      return () => {
        map.remove();
      };
    }
  }, [city, temperatureData]);

  return <div id="map" style={{ height: '400px', width: '100%', marginTop: '20px' }} />;
};

// Componente Principal
function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState('metric');
  const [temperatureData, setTemperatureData] = useState([]);

  const fetchWeather = async () => {
    try {
      setError(null);
      const [weatherResponse, forecastResponse] = await Promise.all([
        axios.get(API_URL_WEATHER, {
          params: {
            q: city,
            appid: API_KEY,
            units: 'metric',
          },
        }),
        axios.get(API_URL_FORECAST, {
          params: {
            q: city,
            appid: API_KEY,
            units: 'metric',
          },
        }),
      ]);

      const { coord, main, name, weather: weatherDetails } = weatherResponse.data;

      // Simula dados de temperatura para o heatmap
      const tempData = [
        { lat: coord.lat, lon: coord.lon, temp: main.temp }, // Cidade escolhida
        { lat: coord.lat + 0.1, lon: coord.lon + 0.1, temp: main.temp + 2 }, // Ponto quente
        { lat: coord.lat - 0.1, lon: coord.lon - 0.1, temp: main.temp - 2 }, // Ponto frio
        { lat: coord.lat + 0.2, lon: coord.lon - 0.2, temp: main.temp + 1 }, // Ponto quente
        { lat: coord.lat - 0.2, lon: coord.lon + 0.2, temp: main.temp - 1 }, // Ponto frio
        { lat: coord.lat + 0.3, lon: coord.lon + 0.3, temp: main.temp + 3 }, // Ponto quente
        { lat: coord.lat - 0.3, lon: coord.lon - 0.3, temp: main.temp - 3 }, // Ponto frio
      ];
      setTemperatureData(tempData);

      const dailyForecast = forecastResponse.data.list
      .filter(item => item.dt_txt.includes('12:00:00'))
      .slice(0, 4); // Limita a 4 dias

    setWeather({ city: { name, coord }, temperature: main.temp, description: weatherDetails[0].description });
    setForecast({ city: forecastResponse.data.city, list: dailyForecast });
  } catch (err) {
    setError('City not found or error fetching data.');
    setWeather(null);
    setForecast(null);
    setTemperatureData([]);
    }
  };

  const toggleUnit = () => {
    setUnit(prevUnit => (prevUnit === 'metric' ? 'imperial' : 'metric'));
  };

  const convertTemperature = (tempCelsius) => {
    return unit === 'metric' ? tempCelsius : (tempCelsius * 9/5) + 32;
  };

  const getWeatherIcon = (description) => {
    if (!description) return <FaCloudSun className="weather-icon" />; // Retorna um ícone padrão se a descrição for undefined

    switch (description.toLowerCase()) {
      case 'clear sky':
        return <FaSun className="weather-icon" />;
      case 'few clouds':
      case 'scattered clouds':
      case 'broken clouds':
      case 'overcast clouds':
        return <FaCloud className="weather-icon" />;
      case 'shower rain':
      case 'rain':
      case 'light rain':
      case 'moderate rain':
        return <FaCloudRain className="weather-icon" />;
      case 'snow':
        return <FaSnowflake className="weather-icon" />;
      default:
        return <FaCloudSun className="weather-icon" />;
    }
  };

  return (
    <div className="app-container">
      <div className="weather-card">
        <h1 className="title">
          <FaCloudSun className="mr-2" /> Weather Forecast
        </h1>
        <div className="search-container">
          <FaMapMarkerAlt className="text-gray-600 mx-2" />
          <input
            type="text"
            placeholder="Enter a city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="flex justify-between">
          <button 
            onClick={fetchWeather} 
            className="search-button">
            <FaSearch className="mr-2" /> Search
          </button>
          <button 
            onClick={toggleUnit} 
            className="unit-button">
            <FaThermometerHalf className="mr-2" /> Switch to {unit === 'metric' ? 'Fahrenheit' : 'Celsius'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
        {weather && (
          <div className={`forecast-container ${getTemperatureColor(weather.temperature)} p-4 rounded-lg`}>
            <h2 className="forecast-title">
              <FaMapMarkerAlt className="mr-2" /> {weather.city.name}
            </h2>
            <p className="forecast-temp">
              <FaThermometerHalf className="mr-2" />
              Temperature: {convertTemperature(weather.temperature).toFixed(1)}°{unit === 'metric' ? 'C' : 'F'}
            </p>
            <p className="forecast-description">
              {getWeatherIcon(weather.description)}
              Description: {weather.description}
            </p>
          </div>
        )}
        {forecast && (
          <div className="forecast-container">
            <h3 className="text-lg text-gray-700 text-center mb-4">4-Day Forecast</h3>
            <ul className="forecast-list">
              {forecast.list.map((day, index) => (
                <li key={index} className={`forecast-item ${getTemperatureColor(day.main.temp)} p-4 rounded-lg mb-2`}>
                  <strong className="forecast-date">{new Date(day.dt_txt).toLocaleDateString()}</strong>
                  <p className="forecast-temp">
                    <FaThermometerHalf className="mr-2" />
                    Temperature: {convertTemperature(day.main.temp).toFixed(1)}°{unit === 'metric' ? 'C' : 'F'}
                  </p>
                  <p className="forecast-description">
                    {getWeatherIcon(day.weather[0]?.description)}
                    Description: {day.weather[0]?.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {weather && temperatureData.length > 0 && (
          <TemperatureMap city={weather.city} temperatureData={temperatureData} />
        )}
      </div>
    </div>
  );
}

export default App;