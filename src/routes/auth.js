const router = require("express").Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/auth");
const { requireAuth } = require("../middleware/auth");

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  ctrl.register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  ctrl.login
);

router.get("/me", requireAuth, ctrl.me);
router.patch("/me", requireAuth, ctrl.updateProfile);
router.delete("/me", requireAuth, ctrl.deleteAccount);

module.exports = router;
