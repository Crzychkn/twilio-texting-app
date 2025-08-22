import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ContactsProvider } from './ContactsContext'
import 'antd/dist/reset.css'
import { HashRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <ContactsProvider>
      <App/>
    </ContactsProvider>
  </HashRouter>
)
