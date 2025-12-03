import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { RouteProvider } from './context/RouteContext'
import { WeatherProvider } from './context/WeatherContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouteProvider>
      <WeatherProvider>
        <App />
      </WeatherProvider>
    </RouteProvider>
  </React.StrictMode>,
)
