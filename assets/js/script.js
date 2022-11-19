// Appel de l'API TvMaze en fonction de la demande utilisateur (nom de la serie) et appel de la création de la presentation general et des episodes
const showTvShow = async (query = null) => {
    let tvShowData, tvShowImages, tvShowSeasons, tvShowID;
    try {
        if (query) {
            tvShowData = await getTvShowFromAPI(`https://api.tvmaze.com/singlesearch/shows?q=${query}`);
            tvShowID = tvShowData.data.id
            console.log(tvShowID)
        } else {
            tvShowData = await getTvShowFromAPI(`https://api.tvmaze.com/shows/435`);
            tvShowID = 435
        }
        tvShowImages = await getTvShowFromAPI(`https://api.tvmaze.com/shows/${tvShowID}/images`);
        tvShowSeasons = await getTvShowFromAPI(`https://api.tvmaze.com/shows/${tvShowID}/seasons`);
        setGeneralPresentation(tvShowData.data);
        setBackgroundImage(tvShowImages.data);
        const seasonsInfo = searchAndShowSeasons(tvShowSeasons.data);
        await setEpisodes(seasonsInfo, 0);
        getUserSeasonEntry(seasonsInfo);

    } catch (e) {
        console.log("404 error. Not found!", e)
    }
}

// Connexion à l'API et recuperation des données
const getTvShowFromAPI = async (url) => {
    try {
        const res = await axios.get(url);
        return res;
    } catch (e) {
        console.log(e);
        return;
    }
}

// Creation d'un element html avec injection du contenu et attribution d'une classe
function createAnElement(content, type, c = null) {
    const element = document.createElement(type);
    element.innerHTML = content;
    if (c) {
        element.setAttribute("class", c)
    }
    return element;
}

// Creation pas à pas de la presentation generale de la serie
function setGeneralPresentation(tvShowData) {
    const presentation = document.querySelector(".presentation-container");
    const tsProp = document.querySelector(".tv-show-prop");
    const starRatingWrapper = document.querySelector('.star-rating');
    const frontStars = document.querySelector('.front-stars');
    // Application du rating de la serie 
    const percentage = `${tvShowData.rating.average * 10}%`;
    starRatingWrapper.title = percentage;
    frontStars.style.width = percentage;
    // *******
    const title = createAnElement(tvShowData.name, 'h2', 'title');
    let genresContent = "TV show";
    for (const genre of tvShowData.genres) { genresContent += ` ${genre.toLowerCase()}` };
    const genres = createAnElement(genresContent, 'p', 'bold-font');
    let dateContent = tvShowData.premiered.slice(0, 4);
    const endYear = tvShowData.ended ? ` - ${tvShowData.ended.slice(0, 4)}` : " - now";
    dateContent += endYear;
    const date = createAnElement(dateContent, 'p', 'regular-font');
    const network = createAnElement(tvShowData.network.name, 'p', 'regular-font');
    const country = createAnElement(tvShowData.network.country.code, 'p', 'regular-font');
    const summary = createAnElement(tvShowData.summary, 'div');
    const btnStream = createAnElement('Go stream', 'a', 'btn-stream bold-font mt-3');
    btnStream.setAttribute('href', tvShowData.network.officialSite);
    tsProp.append(genres, date, network, country);
    presentation.prepend(title, tsProp)
    presentation.append(summary, btnStream);
}

// Applique l'image de fond si l'API fournit une image de type 'background'
function setBackgroundImage(tvShowImages) {
    const bg = document.querySelector("#presentation");
    for (const image of tvShowImages) {
        if (image.type === 'background') {
            bg.style.backgroundImage = `url(${image.resolutions.original.url})`;
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'top';
            return;
        }
    }
}


//Fait un appel API des episodes de la saison demandée et affiche les informations de chaque épisode
async function setEpisodes(seasonsInfo, season) {
    const seasonID = seasonsInfo.id[parseInt(season)];
    const seasonOrder = seasonsInfo.order[parseInt(season)];
    try {
        const { data } = await getTvShowFromAPI(`https://api.tvmaze.com/seasons/${seasonsInfo.id[parseInt(season)]}/episodes`);

        const episodesContainer = document.querySelector('.episodes-container');
        for (i = 0; i < seasonOrder; i++) {
            const episode = data[i];
            const article = createAnElement('', 'article', "episode-container");
            const episodeImg = createAnElement('', 'img');
            if (episode.image.medium) { episodeImg.setAttribute("src", `${episode.image.medium}`); }
            const div1 = createAnElement('', 'div');
            const div2 = createAnElement('', 'div');
            let episodeNumContent = '';
            if (episode.number) { episodeNumContent = `${episode.number}/${seasonOrder}` }
            const episodeNum = createAnElement(episodeNumContent, 'span', 'bold-font');
            const episodeName = createAnElement(episode.name, 'p');
            div2.append(episodeNum, episodeName);
            const episodeSummary = createAnElement(episode.summary, 'div', 'episode-summary');
            div1.append(div2, episodeSummary);
            article.append(episodeImg, div1);
            episodesContainer.append(article);
        }
    } catch {
        console.log('Error with episodes', e)
    }
}


// Recherche les informations de chaque saison de la serie pour en extraire le nombre de saison compléte et le nombre d'épisode par saison (hors episode "hors-serie" qui ne sont pas complet). Crée les boutons de switch entre saison
function searchAndShowSeasons(tvShowSeasons) {
    const seasonsContainer = document.querySelector(".seasons-switch");
    const numSeasons = (tvShowSeasons[tvShowSeasons.length - 1].endDate !== null) ? tvShowSeasons.length : tvShowSeasons.length - 1;
    const seasonsInfo = {};
    const seasonsID = [];
    const seasonsOrder = [];
    for (i = 0; i < numSeasons; i++) {
        const btnSeason = createAnElement(`${i + 1}`, 'button', 'btn-season');
        btnSeason.setAttribute('value', `${i}`);
        seasonsContainer.append(btnSeason);
        seasonsID.push(tvShowSeasons[i].id);
        seasonsOrder.push(tvShowSeasons[i].episodeOrder);
    }
    seasonsInfo.id = seasonsID
    seasonsInfo.order = seasonsOrder
    return seasonsInfo;
}

// Surveille les boutons de switch de saison et change les episodes en fonction de la saison demandée
function getUserSeasonEntry(seasonsID) {
    const btnSeasons = document.querySelectorAll(".btn-season");
    for (const btnSeason of btnSeasons) {
        btnSeason.addEventListener('click', async () => {
            deleteAllEpisode();
            await setEpisodes(seasonsID, btnSeason.value);
        })
    }
}

// Supprime l'affichage de tous les episodes de la serie
function deleteAllEpisode() {
    const episodeArticles = document.querySelectorAll('.episode-container');
    for (const episodeArticle of episodeArticles) {
        episodeArticle.remove();
    }
}

// Supprime l'affichage de tous les éléments dynamiques de la page
function resetAll() {
    const presentationChild = document.querySelectorAll(".presentation-container>*:not(.tv-show-prop, .star-rating), .tv-show-prop *");
    const btnSeasons = document.querySelectorAll(".btn-season");
    for (const c of presentationChild) { c.remove() };
    for (const c of btnSeasons) { c.remove() };
    deleteAllEpisode();
}

// Surveille les boutons de recherche de serie et change les information en fonction de la serie demandée
function userTvShowEntry() {
    const tvShowEntryBtn = document.querySelector('#btn-show-query');
    const tvShowEntry = document.querySelector('.show-query');
    tvShowEntryBtn.addEventListener("click", () => {
        resetAll();
        showTvShow(tvShowEntry.value);
    })
}


showTvShow();
userTvShowEntry();