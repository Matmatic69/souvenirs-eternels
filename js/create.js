import { db, storage } from './firebase-config.js';
import { GEMINI_API_KEY } from './gemini-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

const form = document.getElementById('souvenir-form');
const loading = document.getElementById('loading');
const generateButton = document.getElementById('generate-ai-text');
const messageTextarea = document.getElementById('message');
const aiStatus = document.getElementById('ai-status');

// --- Logique de génération de texte par IA ---
generateButton.addEventListener('click', async () => {
    const name = form.name.value;
    const birthdate = form.birthdate.value;
    const deathdate = form.deathdate.value;

    if (!name || !birthdate || !deathdate) {
        alert('Veuillez remplir le nom et les dates avant de générer un texte.');
        return;
    }

    aiStatus.textContent = 'Génération en cours...';
    generateButton.disabled = true;

    const prompt = `Rédige un court texte d'hommage touchant et poétique pour les funérailles de ${name}, né(e) le ${birthdate} et décédé(e) le ${deathdate}. Le ton doit être réconfortant et célébrer la vie de la personne. Ne mentionne pas "funérailles" dans le texte.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur de l'API Gemini: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        messageTextarea.value = generatedText;
        aiStatus.textContent = 'Texte généré avec succès !';

    } catch (error) {
        console.error('Erreur lors de la génération de texte par IA:', error);
        aiStatus.textContent = 'Erreur lors de la génération.';
        alert('Désolé, une erreur est survenue. Veuillez réessayer.');
    } finally {
        generateButton.disabled = false;
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loading.style.display = 'block';

    console.log('🔄 Début du processus de création du souvenir');
    console.log('📊 Firebase Storage et Firestore initialisés correctement');

    try {
        // 1. Récupérer les données du formulaire
        const name = form.name.value;
        const birthdate = form.birthdate.value;
        const deathdate = form.deathdate.value;
        const message = form.message.value;
        const photos = form.photos.files;
        const video = form.videos.files[0];

        console.log('📝 Données du formulaire:', {
            name,
            birthdate,
            deathdate,
            messageLength: message.length,
            photosCount: photos.length,
            hasVideo: !!video
        });

        // 2. Uploader les fichiers sur Firebase Storage
        console.log('📤 Début de l\'upload des fichiers...');
        
        const photoURLs = [];
        for (let i = 0; i < photos.length; i++) {
            const file = photos[i];
            console.log(`📸 Upload photo ${i + 1}/${photos.length}:`, {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            try {
                const photoRef = ref(storage, `souvenirs/${Date.now()}-${file.name}`);
                console.log('🔗 Référence créée:', photoRef.fullPath);
                
                console.log('⬆️ Tentative d\'upload...');
                const uploadResult = await uploadBytes(photoRef, file);
                console.log('✅ Upload réussi:', uploadResult);
                
                console.log('🔗 Récupération de l\'URL...');
                const url = await getDownloadURL(photoRef);
                console.log('✅ URL obtenue:', url);
                
                photoURLs.push(url);
            } catch (uploadError) {
                console.error('❌ Erreur lors de l\'upload de la photo:', uploadError);
                console.error('📊 Détails de l\'erreur:', {
                    code: uploadError.code,
                    message: uploadError.message,
                    name: uploadError.name,
                    stack: uploadError.stack
                });
                throw uploadError;
            }
        }

        let videoURL = '';
        if (video) {
            console.log('🎥 Upload de la vidéo:', {
                name: video.name,
                size: video.size,
                type: video.type
            });
            
            try {
                const videoRef = ref(storage, `souvenirs/${Date.now()}-${video.name}`);
                console.log('🔗 Référence vidéo créée:', videoRef.fullPath);
                
                const uploadResult = await uploadBytes(videoRef, video);
                console.log('✅ Upload vidéo réussi:', uploadResult);
                
                videoURL = await getDownloadURL(videoRef);
                console.log('✅ URL vidéo obtenue:', videoURL);
            } catch (videoError) {
                console.error('❌ Erreur lors de l\'upload de la vidéo:', videoError);
                console.error('📊 Détails de l\'erreur vidéo:', {
                    code: videoError.code,
                    message: videoError.message,
                    name: videoError.name
                });
                throw videoError;
            }
        }

        // 3. Sauvegarder les informations dans Firestore
        console.log('💾 Sauvegarde dans Firestore...');
        console.log('📊 Données à sauvegarder:', {
            name,
            birthdate,
            deathdate,
            messageLength: message.length,
            photoURLsCount: photoURLs.length,
            hasVideoURL: !!videoURL
        });

        const docRef = await addDoc(collection(db, "souvenirs"), {
            name,
            birthdate,
            deathdate,
            message,
            photoURLs,
            videoURL,
            createdAt: new Date()
        });

        console.log('✅ Sauvegarde Firestore réussie, ID:', docRef.id);

        // 4. Générer le lien et le QR Code
        const souvenirURL = `${window.location.origin}/souvenir.html?id=${docRef.id}`;
        console.log('🔗 URL du souvenir générée:', souvenirURL);
        
        // Cacher le formulaire et afficher la section de résultat
        form.style.display = 'none';
        document.getElementById('result').style.display = 'block';

        // Afficher le lien
        const souvenirLink = document.getElementById('souvenir-link');
        souvenirLink.href = souvenirURL;
        souvenirLink.textContent = souvenirURL;

        // Générer le QR Code
        console.log('🔲 Génération du QR Code...');
        new QRCode(document.getElementById("qrcode"), {
            text: souvenirURL,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        console.log('✅ Processus terminé avec succès !');

    } catch (error) {
        console.error("❌ ERREUR PRINCIPALE lors de la création du souvenir:", error);
        console.error('📊 Type d\'erreur:', error.constructor.name);
        console.error('📊 Code d\'erreur:', error.code);
        console.error('📊 Message:', error.message);
        console.error('📊 Stack complète:', error.stack);
        
        // Informations supplémentaires selon le type d'erreur
        if (error.code) {
            console.error('🔍 Code d\'erreur Firebase:', error.code);
            if (error.code.includes('storage')) {
                console.error('🔥 Il s\'agit d\'une erreur Firebase Storage');
                console.error('📊 Bucket configuré:', storage._bucket);
                console.error('📊 Projet Firebase:', db._delegate._databaseId.projectId);
            }
        }
        
        alert(`Une erreur est survenue: ${error.message}\nConsultez la console pour plus de détails.`);
        // Remettre le formulaire visible en cas d'erreur
        form.style.display = 'block';
    } finally {
        loading.style.display = 'none';
        console.log('🏁 Fin du processus (succès ou échec)');
    }
});
