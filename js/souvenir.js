import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

async function loadSouvenir() {
    const souvenirContent = document.getElementById('souvenir-content');
    const urlParams = new URLSearchParams(window.location.search);
    const souvenirId = urlParams.get('id');

    if (!souvenirId) {
        souvenirContent.innerHTML = '<p>Aucun souvenir trouvé. Veuillez vérifier le lien.</p>';
        return;
    }

    try {
        const docRef = doc(db, "souvenirs", souvenirId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Mettre à jour le titre de la page
            document.title = `En mémoire de ${data.name}`;

            // Construire le HTML
            let html = `
                <h1>${data.name}</h1>
                <p class="dates">${data.birthdate} - ${data.deathdate}</p>
                <p class="message">${data.message.replace(/\n/g, '<br>')}</p>
            `;

            if (data.videoURL) {
                html += `
                    <div class="main-video">
                        <video controls src="${data.videoURL}"></video>
                    </div>
                `;
            }

            if (data.photoURLs && data.photoURLs.length > 0) {
                html += '<h2>Galerie de photos</h2>';
                html += '<div class="gallery">';
                data.photoURLs.forEach(url => {
                    html += `<a href="${url}" target="_blank"><img src="${url}" alt="Souvenir de ${data.name}"></a>`;
                });
                html += '</div>';
            }
            
            souvenirContent.innerHTML = html;

        } else {
            console.log("No such document!");
            souvenirContent.innerHTML = '<p>Ce souvenir n\'existe pas ou a été supprimé.</p>';
        }
    } catch (error) {
        console.error("Erreur lors du chargement du souvenir: ", error);
        souvenirContent.innerHTML = '<p>Une erreur est survenue lors du chargement du souvenir.</p>';
    }
}

window.onload = loadSouvenir;
