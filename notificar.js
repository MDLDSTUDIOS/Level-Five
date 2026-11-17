const admin = require("firebase-admin");

// Cargar credenciales de Firebase desde GitHub Secrets
const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

const deviceToken = process.env.FCM_DEVICE_TOKEN;

// Iniciar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

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
                    admin.firestore.FieldValue.serverTimestamp()
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
