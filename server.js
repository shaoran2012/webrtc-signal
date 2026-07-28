const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let vendors = new Set(); // Список активних продавців

io.on('connection', (socket) => {
  console.log('🟢 [CONNECT] Новий сокет:', socket.id);

  // 1. Реєстрація продавця
  socket.on('register-vendor', () => {
    vendors.add(socket.id);
    console.log(`👨‍💼 [REGISTER] Зареєстровано продавця: ${socket.id}. Всього продавців: ${vendors.size}`);
  });

  // 2. Покупець викликає продавця
  socket.on('call-vendor', (data) => {
    console.log(`📞 [CALL-REQ] Покупець ${socket.id} телефонує.`);
    console.log(`📊 [DEBUG] Активних продавців у пам'яті: ${vendors.size}`);

    if (vendors.size === 0) {
      console.log('⚠️ [WARNING] Немає жодного активного продавця! Дзвінок нікому відправити.');
      socket.emit('error-msg', 'Продавці зараз офлайн');
      return;
    }

    vendors.forEach(vendorSocketId => {
      console.log(`➡️ [SEND] Відправляємо 'incoming-call' продавцю: ${vendorSocketId}`);
      io.to(vendorSocketId).emit('incoming-call', {
        buyerSocketId: socket.id,
        product_name: data.product_name,
        product_price: data.product_price,
        currency: data.currency
      });
    });
  });

  // 3. Обмін WebRTC сигналами
  socket.on('signal', (data) => {
    if (data.to) {
      console.log(`📡 [SIGNAL] Від ${socket.id} до ${data.to}`);
      io.to(data.to).emit('signal', {
        from: socket.id,
        sdp: data.sdp,
        candidate: data.candidate
      });
    } else {
      console.log(`⚠️ [SIGNAL ERROR] Сигнал від ${socket.id} не має адресата (поле 'to' порожнє!)`);
    }
  });

  // 4. Продавець просить завдаток
  socket.on('request-escrow', (data) => {
    if (data.to) {
      console.log(`💰 [ESCROW] Запит завдатку до ${data.to}`);
      io.to(data.to).emit('escrow-requested', {
        amount: data.amount
      });
    }
  });

  // Відключення
  socket.on('disconnect', () => {
    if (vendors.has(socket.id)) {
      vendors.delete(socket.id);
      console.log(`👨‍💼🔴 [VENDOR LEFT] Продавець ${socket.id} вийшов. Залишилось: ${vendors.size}`);
    } else {
      console.log('🔴 [DISCONNECT] Відключився:', socket.id);
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер працює на порту ${PORT}`);
});
