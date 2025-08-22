import { createContext, useContext, useState } from 'react';

const ContactsContext = createContext(null);

export const ContactsProvider = ({ children }) => {
  const [contacts, setContacts] = useState([]);

  return (
    <ContactsContext.Provider value={{ contacts, setContacts }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const ctx = useContext(ContactsContext);
  if (!ctx) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return ctx;
}
