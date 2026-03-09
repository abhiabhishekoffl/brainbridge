/**
 * Validates incoming session data from the React frontend.
 * Ensures game data is present and well-formed before
 * passing it to the ML pipeline.
 */
function validateSession(req, res, next) {
  const { sessionId, age, language, gameData } = req.body;

  // Session ID
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing or invalid sessionId" });
  }

  // Age
  const parsedAge = parseInt(age);
  if (isNaN(parsedAge) || parsedAge < 4 || parsedAge > 7) {
    return res.status(400).json({ error: "Age must be between 4 and 7" });
  }

  // Game data
  if (!gameData || typeof gameData !== "object") {
    return res.status(400).json({ error: "Missing gameData" });
  }

  // At least one game must have been played
  const { mirror, focus } = gameData;
  if (!mirror && !focus) {
    return res.status(400).json({ error: "No game data found. At least one game required." });
  }

  // Mirror game — must be an array
  if (mirror && !Array.isArray(mirror)) {
    return res.status(400).json({ error: "mirror must be an array of events" });
  }

  // Focus game — must be an object with events array
  if (focus && (!focus.events || !Array.isArray(focus.events))) {
    return res.status(400).json({ error: "focus must have an events array" });
  }

  next();
}

module.exports = { validateSession };
