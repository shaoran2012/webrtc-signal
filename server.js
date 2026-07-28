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
  console.log('🟢 Нове підключення:', socket.id);

  // 1. Реєстрація продавця
  socket.on('register-vendor', () => {
    vendors.add(socket.id);
    console.log('👨‍💼 Зареєстровано продавця:', socket.id);
  });

  // 2. Покупець викликає продавця
  socket.on('call-vendor', (data) => {
    console.log(`📞 Покупець ${socket.id} телефонує по товару ${data.product_name}`);
    
    // Надсилаємо сповіщення усім підключеним продавцям
    vendors.forEach(vendorSocketId => {
      io.to(vendorSocketId).emit('incoming-call', {
        buyerSocketId: socket.id,
        product_name: data.product_name,
        product_price: data.product_price,
        currency: data.currency
      });
    });
  });

  // 3. Обмін WebRTC сигналами (SDP та ICE Candidates) між двома конкретними точками
  socket.on('signal', (data) => {
    if (data.to) {
      io.to(data.to).emit('signal', {
        from: socket.id,
        sdp: data.sdp,
        candidate: data.candidate
      });
    }
  });

  // 4. Продавець просить завдаток
  socket.on('request-escrow', (data) => {
    if (data.to) {
      io.to(data.to).emit('escrow-requested', {
        amount: data.amount
      });
    }
  });

  // Відключення користувача
  socket.on('disconnect', () => {
    vendors.delete(socket.id);
    console.log('🔴 Відключився:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер працює на порту ${PORT}`);
});
