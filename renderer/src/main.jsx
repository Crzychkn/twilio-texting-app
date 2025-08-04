import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ContactsProvider } from './ContactsContext'
import 'antd/dist/reset.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ContactsProvider>
    <App />
  </ContactsProvider>
)
