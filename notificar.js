const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Cargar credenciales de Firebase desde GitHub Secrets
const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

const deviceToken = process.env.FCM_DEVICE_TOKEN;

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const messaging = getMessaging();

async function enviarNotificaciones() {
    try {
        if (!deviceToken) {
            throw new Error("No se encontró el token del dispositivo.");
        }

        // Buscar reservaciones pendientes
        const resultado = await db
            .collection("reservaciones")
            .where("estado", "==", "pendiente")
            .get();

        for (const documento of resultado.docs) {
            const reserva = documento.data();

            // Evitar notificar dos veces la misma reserva
            if (reserva.notificacionEnviada === true) {
                continue;
            }

            // Enviar notificación al teléfono
            await messaging.send({
                token: deviceToken,
                notification: {
                    title: "Level Five Barber",
                    body: "Nueva reservación"
                }
            });

            // Marcar la reserva como notificada
            await documento.ref.update({
                notificacionEnviada: true,
                notificacionEnviadaEn:
                   FieldValue.serverTimestamp()
            });

            console.log(
                "Notificación enviada:",
                documento.id
            );
        }

        console.log("Proceso terminado correctamente.");

    } catch (error) {
        console.error("Error al enviar notificaciones:", error);
        process.exitCode = 1;
    }
}

enviarNotificaciones();
