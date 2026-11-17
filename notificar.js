
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const deviceToken = process.env.FCM_DEVICE_TOKEN;

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const messaging = getMessaging();

async function enviarNotificaciones() {
    try {
        if (!deviceToken) {
            throw new Error("Falta el token FCM.");
        }

        console.log("Proyecto Firebase:", serviceAccount.project_id);

        const resultado = await db
            .collection("reservaciones")
            .where("estado", "==", "pendiente")
            .get();

        console.log("Reservaciones pendientes encontradas:", resultado.size);

        for (const documento of resultado.docs) {
            const reserva = documento.data();

            if (reserva.notificacionEnviada === true) {
                continue;
            }

            await messaging.send({
                token: deviceToken,
                notification: {
                    title: "Level Five Barber",
                    body: "Nueva reservación"
                }
            });

            await documento.ref.update({
                notificacionEnviada: true,
                notificacionEnviadaEn: FieldValue.serverTimestamp()
            });

            console.log("Notificación enviada:", documento.id);
        }

        console.log("Proceso terminado correctamente.");

    } catch (error) {
        console.error("ERROR:", error);
        process.exitCode = 1;
    }
}

enviarNotificaciones();
