
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD9oCEAx85fCc_7iXf44wRJJt7TnSwb2UM",
    authDomain: "level-five-barber-ca1b7.firebaseapp.com",
    projectId: "level-five-barber-ca1b7",
    storageBucket: "level-five-barber-ca1b7.firebasestorage.app",
    messagingSenderId: "382628281931",
    appId: "1:382628281931:web:c24c582751d145d7a4d7ce"
};

// INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase conectado correctamente");

// ELEMENTOS HTML
const nombre = document.getElementById("nombre");
const fecha = document.getElementById("fecha");
const horarios = document.getElementById("horariosDisponibles");
const btnReservar = document.getElementById("btnReservar");
const mensaje = document.getElementById("mensaje");

let horarioSeleccionado = null;

// SELECCIONAR HORARIO
horarios.addEventListener("click", function(event) {

    if (event.target.tagName !== "BUTTON") {
        return;
    }

    if (event.target.disabled) {
        return;
    }

    horarioSeleccionado = event.target.dataset.hora;

    const botones = horarios.querySelectorAll("button");

    botones.forEach(function(boton) {
        boton.style.backgroundColor = "";
        boton.style.color = "";
    });

    event.target.style.backgroundColor = "#222";
    event.target.style.color = "#fff";

    console.log("Horario seleccionado:", horarioSeleccionado);

});

// ENVIAR RESERVACIÓN
btnReservar.addEventListener("click", async function() {

    const nombreCliente = nombre.value.trim();
    const fechaReserva = fecha.value;
    const horaReserva = horarioSeleccionado;

    // VALIDAR NOMBRE
    if (!nombreCliente) {
        mensaje.textContent = "Ingresa tu nombre.";
        return;
    }

    if (nombreCliente.length > 100) {
        mensaje.textContent = "El nombre es demasiado largo.";
        return;
    }

    // VALIDAR FECHA
    if (!fechaReserva) {
        mensaje.textContent = "Selecciona una fecha.";
        return;
    }

    // VALIDAR HORARIO
    if (!horaReserva) {
        mensaje.textContent = "Selecciona un horario.";
        return;
    }

    const horariosPermitidos = [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00"
    ];

    if (!horariosPermitidos.includes(horaReserva)) {
        mensaje.textContent = "El horario seleccionado no es válido.";
        return;
    }

    // DESACTIVAR BOTÓN
    btnReservar.disabled = true;
    mensaje.textContent = "Comprobando disponibilidad...";

    try {

        // CREAR REFERENCIAS
        const reservaRef = doc(collection(db, "reservaciones"));

        const horarioId = `${fechaReserva}_${horaReserva}`;

        const horarioRef = doc(
            db,
            "horariosOcupados",
            horarioId
        );

        // TRANSACCIÓN: RESERVACIÓN + BLOQUEO
        await runTransaction(db, async (transaction) => {

            // PRIMERO LEER EL HORARIO
            const horarioActual = await transaction.get(horarioRef);

            if (horarioActual.exists()) {
                throw new Error("HORARIO_OCUPADO");
            }

            // CREAR RESERVACIÓN
            transaction.set(reservaRef, {
                nombre: nombreCliente,
                fecha: fechaReserva,
                hora: horaReserva,
                estado: "pendiente",
                creadoEn: serverTimestamp()
            });

            // BLOQUEAR HORARIO
            transaction.set(horarioRef, {
                reservaId: reservaRef.id,
                fecha: fechaReserva,
                hora: horaReserva,
                estado: "pendiente",
                creadoEn: serverTimestamp()
            });

        });

        console.log("Reservación guardada:", reservaRef.id);

        mensaje.textContent =
            "¡Solicitud enviada correctamente! Espera la confirmación del barbero.";

        // LIMPIAR FORMULARIO
        nombre.value = "";
        horarioSeleccionado = null;

        const botones = horarios.querySelectorAll("button");

        botones.forEach(function(boton) {
            boton.style.backgroundColor = "";
            boton.style.color = "";
        });

    } catch (error) {

        console.error("Error al reservar:", error);

        if (error.message === "HORARIO_OCUPADO") {

            mensaje.textContent =
                "Lo sentimos, ese horario ya tiene una solicitud o está ocupado. Selecciona otro.";

        } else {

            mensaje.textContent =
                "No se pudo enviar la solicitud. Inténtalo nuevamente.";

        }

    } finally {

        btnReservar.disabled = false;

    }

});
