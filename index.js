require('dotenv').config();
const { exec } = require('child_process');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/impresoras/listar', (req, res) => {
  exec('wmic printer get name', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al listar impresoras: ${error.message}`);
      return res.status(500).json({ error: 'Error al listar impresoras' });
    }

    const impresoras = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== 'Name');
    res.json(impresoras);
  });
});

app.post('/api/impresoras/imprimir', (req, res) => {
  const { document, printerName } = req.body;

  if (!document || !printerName) {
    return res.status(400).json({ error: 'Faltan datos: document y printerName son requeridos' });
  }

  // Decodificar el documento de base64 a un Buffer
  const documentBuffer = Buffer.from(document, 'base64');

  // Definir el path del archivo temporal
  const tempFilePath = path.join(__dirname, 'temp_document.pdf');

  // Guardar el Buffer como un archivo temporal
  fs.writeFile(tempFilePath, documentBuffer, (err) => {
    if (err) {
      console.error(`Error al crear el archivo temporal: ${err.message}`);
      return res.status(500).json({ error: 'Error al crear el archivo temporal' });
    }

    // Imprimir el archivo temporal
    const printCommand =
      process.platform === 'win32'
        ? `print /d:"${printerName}" "${tempFilePath}"`
        : `lp -d ${printerName} ${tempFilePath}`;

    exec(printCommand, (error, stdout, stderr) => {
      // Eliminar el archivo temporal después de la impresión
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Error al eliminar el archivo temporal: ${unlinkErr.message}`);
        }
      });

      if (error) {
        console.error(`Error al imprimir: ${error.message}`);
        return res.status(500).json({ error: 'Error al enviar el documento a la impresora' });
      }

      console.log('Documento enviado a la impresora');
      res.status(200).json({ message: 'Documento enviado a la impresora' });
    });
  });
});

app.listen(process.env.PORT, () => {
  console.log('Servidor iniciado en el puerto ' + process.env.PORT);
});
