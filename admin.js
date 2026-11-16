
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    runTransaction,
    query,
    orderBy,
    writeBatch
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
const auth = getAuth(app);
const db = getFirestore(app);

// UID DEL BARBERO
const UID_BARBERO = "jYcZSle7sydp3W53X8hCM7sMtC23";

// ELEMENTOS HTML
const login = document.getElementById("login");
const panel = document.getElementById("panel");

const correo = document.getElementById("correo");
const contrasena = document.getElementById("contrasena");
const mensajeLogin = document.getElementById("mensajeLogin");

const listaReservaciones = document.getElementById("listaReservaciones");

const modalBorrarCache = document.getElementById("modalBorrarCache");
const contrasenaBorrarCache = document.getElementById("contrasenaBorrarCache");
const mensajeBorrarCache = document.getElementById("mensajeBorrarCache");

// INICIAR SESIÓN
document.getElementById("btnLogin").addEventListener("click", async () => {

    const email = correo.value.trim();
    const password = contrasena.value;

    if (!email || !password) {
        mensajeLogin.textContent = "Completa todos los campos.";
        return;
    }

    try {

        await signInWithEmailAndPassword(auth, email, password);
        mensajeLogin.textContent = "";

    } catch (error) {

        console.error(error);
        mensajeLogin.textContent = "Correo o contraseña incorrectos.";

    }

});

// CONTROLAR SESIÓN
onAuthStateChanged(auth, async (user) => {

    if (user && user.uid === UID_BARBERO) {

        login.hidden = true;
        panel.hidden = false;

        await cargarReservaciones();

    } else {

        if (user) {
            await signOut(auth);
        }

        login.hidden = false;
        panel.hidden = true;

    }

});

// CARGAR RESERVACIONES
async function cargarReservaciones() {

    listaReservaciones.innerHTML = "Cargando reservaciones...";

    try {

        const consulta = query(
            collection(db, "reservaciones"),
            orderBy("creadoEn", "desc")
        );

        const resultado = await getDocs(consulta);

        listaReservaciones.innerHTML = "";

        if (resultado.empty) {
            listaReservaciones.textContent = "No hay reservaciones.";
            return;
        }

        resultado.forEach((documento) => {

            const reserva = documento.data();

            const tarjeta = document.createElement("div");

            const nombre = document.createElement("h3");
            nombre.textContent = reserva.nombre || "Sin nombre";

            const fecha = document.createElement("p");
            fecha.textContent = "Fecha: " + (reserva.fecha || "Sin fecha");

            const hora = document.createElement("p");
            hora.textContent = "Hora: " + (reserva.hora || "Sin hora");

            const estado = document.createElement("p");
            estado.textContent = "Estado: " + (reserva.estado || "Desconocido");

            tarjeta.appendChild(nombre);
            tarjeta.appendChild(fecha);
            tarjeta.appendChild(hora);
            tarjeta.appendChild(estado);

            if (reserva.estado === "pendiente") {

                const btnAceptar = document.createElement("button");
                btnAceptar.textContent = "Aceptar";

                btnAceptar.addEventListener("click", () => {
                    aceptarReservacion(documento.id, reserva);
                });

                const btnRechazar = document.createElement("button");
                btnRechazar.textContent = "Rechazar";

                btnRechazar.addEventListener("click", () => {
                    rechazarReservacion(documento.id, reserva);
                });

                tarjeta.appendChild(btnAceptar);
                tarjeta.appendChild(btnRechazar);

            }

            listaReservaciones.appendChild(tarjeta);

        });

    } catch (error) {

        console.error(error);

        listaReservaciones.textContent =
            "No se pudieron cargar las reservaciones.";

    }

}

// ACEPTAR RESERVACIÓN
async function aceptarReservacion(id, reserva) {

    try {

        await runTransaction(db, async (transaction) => {

            const reservaRef = doc(db, "reservaciones", id);

            const horarioRef = doc(
                db,
                "horariosOcupados",
                `${reserva.fecha}_${reserva.hora}`
            );

            // LEER AMBOS DOCUMENTOS
            const reservaActual = await transaction.get(reservaRef);
            const horarioActual = await transaction.get(horarioRef);

            if (!reservaActual.exists()) {
                throw new Error("La reservación ya no existe.");
            }

            if (reservaActual.data().estado !== "pendiente") {
                throw new Error("Esta reservación ya fue procesada.");
            }

            if (!horarioActual.exists()) {
                throw new Error(
                    "No se encontró el bloqueo del horario. Comprueba los datos o limpia las reservaciones antiguas."
                );
            }

            if (horarioActual.data().reservaId !== id) {
                throw new Error("El horario pertenece a otra reservación.");
            }

            if (horarioActual.data().estado !== "pendiente") {
                throw new Error("El horario ya fue procesado.");
            }

            // ACTUALIZAR LOS DOS DOCUMENTOS
            transaction.update(reservaRef, {
                estado: "aceptada"
            });

            transaction.update(horarioRef, {
                estado: "aceptada"
            });

        });

        alert("Reservación aceptada. El horario continúa ocupado.");

        await cargarReservaciones();

    } catch (error) {

        console.error(error);
        alert(error.message || "No se pudo aceptar la reservación.");

    }

}

// RECHAZAR RESERVACIÓN
async function rechazarReservacion(id, reserva) {

    try {

        await runTransaction(db, async (transaction) => {

            const reservaRef = doc(db, "reservaciones", id);

            const horarioRef = doc(
                db,
                "horariosOcupados",
                `${reserva.fecha}_${reserva.hora}`
            );

            // LEER AMBOS DOCUMENTOS
            const reservaActual = await transaction.get(reservaRef);
            const horarioActual = await transaction.get(horarioRef);

            if (!reservaActual.exists()) {
                throw new Error("La reservación ya no existe.");
            }

            if (reservaActual.data().estado !== "pendiente") {
                throw new Error("Esta reservación ya fue procesada.");
            }

            // CAMBIAR ESTADO DE RESERVACIÓN
            transaction.update(reservaRef, {
                estado: "rechazada"
            });

            // LIBERAR EL HORARIO SI EL BLOQUEO LE PERTENECE
            if (horarioActual.exists()) {

                if (horarioActual.data().reservaId !== id) {
                    throw new Error("El bloqueo pertenece a otra reservación.");
                }

                transaction.delete(horarioRef);

            }

        });

        alert("Reservación rechazada. El horario vuelve a estar disponible.");

        await cargarReservaciones();

    } catch (error) {

        console.error(error);
        alert(error.message || "No se pudo rechazar la reservación.");

    }

}

// ABRIR VENTANA DE BORRADO
document.getElementById("btnBorrarCache").addEventListener("click", () => {

    contrasenaBorrarCache.value = "";
    mensajeBorrarCache.textContent = "";

    modalBorrarCache.hidden = false;

});

// CANCELAR BORRADO
document.getElementById("btnCancelarBorrado").addEventListener("click", () => {

    modalBorrarCache.hidden = true;
    contrasenaBorrarCache.value = "";
    mensajeBorrarCache.textContent = "";

});

// CONFIRMAR BORRADO
document.getElementById("btnConfirmarBorrado").addEventListener("click", async () => {

    const password = contrasenaBorrarCache.value;
    const user = auth.currentUser;

    if (!password) {
        mensajeBorrarCache.textContent = "Introduce tu contraseña.";
        return;
    }

    if (!user || !user.email || user.uid !== UID_BARBERO) {
        mensajeBorrarCache.textContent = "No hay una sesión autorizada.";
        return;
    }

    const confirmar = confirm(
        "¿Estás seguro? Se eliminarán todas las reservaciones y horarios ocupados."
    );

    if (!confirmar) {
        return;
    }

    const boton = document.getElementById("btnConfirmarBorrado");
    boton.disabled = true;

    mensajeBorrarCache.textContent = "Verificando contraseña...";

    try {

        // REAUTENTICAR AL BARBERO
        const credencial = EmailAuthProvider.credential(
            user.email,
            password
        );

        await reauthenticateWithCredential(user, credencial);

        mensajeBorrarCache.textContent = "Obteniendo datos...";

        const reservas = await getDocs(
            collection(db, "reservaciones")
        );

        const horarios = await getDocs(
            collection(db, "horariosOcupados")
        );

        const documentos = [
            ...reservas.docs,
            ...horarios.docs
        ];

        // ELIMINAR EN LOTES
        for (let i = 0; i < documentos.length; i += 450) {

            const lote = writeBatch(db);

            const grupo = documentos.slice(i, i + 450);

            grupo.forEach((documento) => {
                lote.delete(documento.ref);
            });

            await lote.commit();

        }

        contrasenaBorrarCache.value = "";
        mensajeBorrarCache.textContent = "";
        modalBorrarCache.hidden = true;

        alert(
            "Caché borrada correctamente. Se eliminaron " +
            documentos.length +
            " documentos."
        );

        await cargarReservaciones();

    } catch (error) {

        console.error(error);

        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password" ||
            error.code === "auth/invalid-login-credentials"
        ) {

            mensajeBorrarCache.textContent =
                "La contraseña es incorrecta.";

        } else {

            mensajeBorrarCache.textContent =
                "No se pudo completar el borrado. Revisa tu conexión y los permisos.";

        }

    } finally {

        boton.disabled = false;

    }

});

// ACTUALIZAR SOLICITUDES
document.getElementById("btnActualizar").addEventListener("click", () => {
    cargarReservaciones();
});

// CERRAR SESIÓN
document.getElementById("btnCerrarSesion").addEventListener("click", async () => {
    await signOut(auth);
});
