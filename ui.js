$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  // togggle start icon and get story id value

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    await loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    await loginAndSubmitForm();
  });

  // allows logged in users to select favorites
  function allowFavStar() {
    $(".fa-star").on("click", async function (e) {
      console.log("Event is run");
      let id = e.target.parentElement.getAttribute("id");

      // toggle star based on class 'checked'
      if ($(e.target).hasClass("checked")) {
        e.target.classList.toggle("checked");
        await currentUser.removeStoryFromFavorites(currentUser, id);
      } else {
        e.target.classList.toggle("checked");
        await currentUser.addStoryToFavorites(currentUser, id);
      }
    });
  }

  // maintains starred articles (home page)
  function writeStarHTML(id) {
    let favIDs = renderFavorites();
    if (favIDs.includes(id)) return "checked";
  }

  // creates array of favorite story ids
  function renderFavorites() {
    if (currentUser) {
      let favoriteIds = [];
      for (storyObj in currentUser.favorites) {
        favoriteIds.push(currentUser.favorites[storyObj].storyId)
      } return favoriteIds;
    } return [];
  };

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    allowFavStar();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {

    // let's see if we're logged in

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    
    await generateStories();

    if (currentUser) {
      
      showNavForLoggedInUser();
      generateFavoriteStories(); 
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  async function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // allow favoriting and update navigation bar
    await generateStories();
    
    showNavForLoggedInUser();
    generateFavoriteStories();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="fa fa-star ${writeStarHTML(story.storyId)}"></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function generateFavoriteStories() {
    $filteredArticles.empty();
   
     for (let favorite of currentUser.favorites) {
      const result = generateStoryHTML(favorite);
      $filteredArticles.append(result);
    };
   allowFavStar();
  };

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    let $navBar = $("#nav-all").parent();
    let $newNavItems = $(
      `<span class="main-nav-links">
        <span class="main-nav-links submit">|<a id="submit-story" href=""><small>submit</small></a></span>
        <span class="main-nav-links favorites">|<a id="favorite-stories"><small>favorites</small></a></span>
        <span class="main-nav-links my-stories">|<a href=""><small>my stories</small></a></span>
      </span>
      `);
    $navBar.append($newNavItems);
    $navLogin.hide();
    $navLogOut.show();
  }

  // MAIN NAV BAR EVENT HANDLERS //

  // event listener for submit (enter new story details)
  $("body").on("click", "#submit-story", async function (evt) {
    evt.preventDefault();
    $submitForm.toggle();
  });

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();

    let newStory = { author, title, url };
    await new StoryList().addStory(currentUser, newStory);

    $submitForm.trigger('reset');

    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  // event listener for favorites (enter new story details)
  $("body").on("click", "#favorite-stories", async function (evt) {
    evt.preventDefault();
    hideElements();
    allowFavStar();
    $filteredArticles.show()
  });

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }


});
