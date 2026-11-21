export const THEME_KEY = "bullxi:theme";

/** Runs before first paint (inlined in <head>) so there is no flash of the wrong theme. */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"){document.documentElement.classList.add("theme-dark");document.documentElement.style.colorScheme="dark";}}catch(e){}`;
