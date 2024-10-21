const {
  default: makeWASocket,
  MessageType,
  MessageOptions,
  Mimetype,
  DisconnectReason,
  BufferJSON,
  AnyMessageContent,
  delay,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  MessageRetryMap,
  useMultiFileAuthState,
  msgRetryCounterMap,
  useSingleFileAuthState
} = require('@whiskeysockets/baileys')

const qrcode = require('qrcode')
const fs = require('fs')
const path = require('path')

async function connectToWhatsApp(number) {

  // Definir una ruta de autenticación para cada número
  const authFilePath = `./auth_info_${number}.json`;
  const { state, saveCreds, saveState } = await useMultiFileAuthState(authFilePath)

  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
  })

  sock.ev.on('connection.update', (update) => {
    const { qr, connection, lastDisconnect } = update

    if (qr) {
      // Generar y guardar el QR como imagen en una carpeta distinta para cada número
      const qrFilePath = path.join(__dirname, `qr_code_${number}.png`);
      qrcode.toFile(qrFilePath, qr, (err) => {
        if (err) {
          console.error(`Error generando el código QR para ${number}:`, err);
        } else {
          console.log(`Código QR guardado para ${number} como ${qrFilePath}`);
        }
      });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log(
        'connection closed due to ',
        lastDisconnect.error,
        ', reconnecting ',
        shouldReconnect
      )
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp()
      }
    } else if (connection === 'open') {
      console.log(`Conectado exitosamente a WhatsApp para el número ${number}opened connection`)
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    console.log(JSON.stringify(m, undefined, 2))

    console.log('replying to', m.messages[0].key.remoteJid)
    await sock.sendMessage(m.messages[0].key.remoteJid, {
      text: 'Hello there!',
    })
  })

  sock.ev.on('creds.update', saveState);
  return sock;
}

// Cargar varias sesiones para diferentes números
async function startMultipleSessions(numbers) {
  const sessions = [];

  for (const number of numbers) {
    const session = await connectToWhatsApp(number);
    sessions.push(session);
  }

  return sessions;
}

// Lista de números de teléfono (o identificadores únicos)
const phoneNumbers = ['1234567890', '0987654321']; // Coloca aquí los números o identificadores de las sesiones

startMultipleSessions(phoneNumbers)
  .then(() => {
    console.log('Todas las sesiones de WhatsApp han sido iniciadas.');
  })
  .catch((error) => {
    console.error('Error al iniciar las sesiones:', error);
  });
