export const SUPPORTED_LANGUAGES: Record<string, { label: string; flag: string }> = {
  fr: { label: "Français",    flag: "🇫🇷" },
  en: { label: "English",     flag: "🇬🇧" },
  es: { label: "Español",     flag: "🇪🇸" },
  pt: { label: "Português",   flag: "🇵🇹" },
  ar: { label: "العربية",     flag: "🇸🇦" },
};

export type Lang = keyof typeof SUPPORTED_LANGUAGES;

export const translations: Record<string, Record<string, string>> = {
  // ── Actions de modération ─────────────────────────────────────────────────
  warn_msg: {
    fr: "⚠️ *{name}* : {reason}\n🔢 Avertissement {count}/{max}",
    en: "⚠️ *{name}* : {reason}\n🔢 Warning {count}/{max}",
    es: "⚠️ *{name}* : {reason}\n🔢 Advertencia {count}/{max}",
    pt: "⚠️ *{name}* : {reason}\n🔢 Aviso {count}/{max}",
    ar: "⚠️ *{name}* : {reason}\n🔢 تحذير {count}/{max}",
  },
  mute_msg: {
    fr: "🔇 *{name}* : {reason} — Silence {duration} min.",
    en: "🔇 *{name}* : {reason} — Muted for {duration} min.",
    es: "🔇 *{name}* : {reason} — Silenciado {duration} min.",
    pt: "🔇 *{name}* : {reason} — Silenciado por {duration} min.",
    ar: "🔇 *{name}* : {reason} — تم كتم الصوت لمدة {duration} دقيقة.",
  },
  ban_msg: {
    fr: "🔨 *{name}* banni : {reason}",
    en: "🔨 *{name}* banned: {reason}",
    es: "🔨 *{name}* baneado: {reason}",
    pt: "🔨 *{name}* banido: {reason}",
    ar: "🔨 تم حظر *{name}* : {reason}",
  },
  autoban_msg: {
    fr: "🔨 *{name}* a été banni automatiquement après {max} avertissements.",
    en: "🔨 *{name}* was automatically banned after {max} warnings.",
    es: "🔨 *{name}* fue baneado automáticamente tras {max} advertencias.",
    pt: "🔨 *{name}* foi banido automaticamente após {max} avisos.",
    ar: "🔨 تم حظر *{name}* تلقائياً بعد {max} تحذيرات.",
  },
  ban_no_rights: {
    fr: "⚠️ *Impossible de bannir {name}.*\n\nLe bot ne dispose pas du droit *\"Bannir des membres\"*.\n\n👉 Allez dans *Gérer le groupe → Administrateurs → {bot}* et activez la permission *\"Bannir des utilisateurs\"*.",
    en: "⚠️ *Cannot ban {name}.*\n\nThe bot does not have the *\"Ban members\"* permission.\n\n👉 Go to *Manage group → Administrators → {bot}* and enable the *\"Ban users\"* permission.",
    es: "⚠️ *No se puede banear a {name}.*\n\nEl bot no tiene el permiso *\"Banear miembros\"*.\n\n👉 Ve a *Gestionar grupo → Administradores → {bot}* y activa el permiso *\"Banear usuarios\"*.",
    pt: "⚠️ *Impossível banir {name}.*\n\nO bot não tem a permissão *\"Banir membros\"*.\n\n👉 Vá em *Gerenciar grupo → Administradores → {bot}* e ative a permissão *\"Banir usuários\"*.",
    ar: "⚠️ *لا يمكن حظر {name}.*\n\nالبوت لا يملك صلاحية *\"حظر الأعضاء\"*.\n\n👉 اذهب إلى *إدارة المجموعة → المشرفون → {bot}* وفعّل صلاحية *\"حظر المستخدمين\"*.",
  },
  // ── Raisons automatiques ──────────────────────────────────────────────────
  reason_link: {
    fr: "Lien non autorisé dans ce groupe",
    en: "Unauthorized link in this group",
    es: "Enlace no autorizado en este grupo",
    pt: "Link não autorizado neste grupo",
    ar: "رابط غير مسموح به في هذه المجموعة",
  },
  reason_spam: {
    fr: "Spam détecté",
    en: "Spam detected",
    es: "Spam detectado",
    pt: "Spam detectado",
    ar: "تم اكتشاف رسائل مزعجة",
  },
  reason_profanity: {
    fr: "Langage inapproprié",
    en: "Inappropriate language",
    es: "Lenguaje inapropiado",
    pt: "Linguagem inapropriada",
    ar: "لغة غير لائقة",
  },
  reason_flood: {
    fr: "Flood : {count} messages en {window}s",
    en: "Flood: {count} messages in {window}s",
    es: "Flood: {count} mensajes en {window}s",
    pt: "Flood: {count} mensagens em {window}s",
    ar: "إرسال مكثف: {count} رسائل في {window} ثانية",
  },
  reason_advertising: {
    fr: "{detail}",
    en: "{detail}",
    es: "{detail}",
    pt: "{detail}",
    ar: "{detail}",
  },
  reason_word_filter: {
    fr: "Mot interdit : \"{word}\"",
    en: "Forbidden word: \"{word}\"",
    es: "Palabra prohibida: \"{word}\"",
    pt: "Palavra proibida: \"{word}\"",
    ar: "كلمة محظورة: \"{word}\"",
  },
  // ── Messages de bienvenue & au revoir ────────────────────────────────────
  welcome_default: {
    fr: "👋 Bienvenue *{name}* dans le groupe !",
    en: "👋 Welcome *{name}* to the group!",
    es: "👋 ¡Bienvenido/a *{name}* al grupo!",
    pt: "👋 Bem-vindo(a) *{name}* ao grupo!",
    ar: "👋 مرحباً *{name}* في المجموعة!",
  },
  goodbye_default: {
    fr: "👋 Au revoir *{name}* !",
    en: "👋 Goodbye *{name}*!",
    es: "👋 ¡Adiós *{name}*!",
    pt: "👋 Adeus *{name}*!",
    ar: "👋 وداعاً *{name}*!",
  },
  // ── Vérification ──────────────────────────────────────────────────────────
  verify_intro: {
    fr: "👋 Bienvenue *{name}* !\n\nAvant de pouvoir écrire dans ce groupe, vous devez lire et accepter nos règles.{rules}\n\n⏱️ Vous avez *{timeout} minute(s)* pour accepter.",
    en: "👋 Welcome *{name}*!\n\nBefore you can write in this group, you must read and accept our rules.{rules}\n\n⏱️ You have *{timeout} minute(s)* to accept.",
    es: "👋 ¡Bienvenido/a *{name}*!\n\nAntes de poder escribir en este grupo, debes leer y aceptar nuestras normas.{rules}\n\n⏱️ Tienes *{timeout} minuto(s)* para aceptar.",
    pt: "👋 Bem-vindo(a) *{name}*!\n\nAntes de escrever neste grupo, você deve ler e aceitar nossas regras.{rules}\n\n⏱️ Você tem *{timeout} minuto(s)* para aceitar.",
    ar: "👋 مرحباً *{name}*!\n\nقبل أن تتمكن من الكتابة في هذه المجموعة، يجب عليك قراءة وقبول قواعدنا.{rules}\n\n⏱️ لديك *{timeout} دقيقة* للقبول.",
  },
  verify_button: {
    fr: "✅ J'accepte les règles et je rejoins le groupe",
    en: "✅ I accept the rules and join the group",
    es: "✅ Acepto las normas y me uno al grupo",
    pt: "✅ Aceito as regras e entro no grupo",
    ar: "✅ أوافق على القواعد وأنضم إلى المجموعة",
  },
  verify_success: {
    fr: "✅ *{name}* a accepté les règles et peut maintenant écrire dans le groupe. Bienvenue !",
    en: "✅ *{name}* accepted the rules and can now write in the group. Welcome!",
    es: "✅ *{name}* aceptó las normas y ya puede escribir en el grupo. ¡Bienvenido/a!",
    pt: "✅ *{name}* aceitou as regras e já pode escrever no grupo. Bem-vindo(a)!",
    ar: "✅ قبل *{name}* القواعد ويمكنه الآن الكتابة في المجموعة. مرحباً!",
  },
  verify_timeout_msg: {
    fr: "⏱️ *{name}* n'a pas accepté les règles dans le délai imparti et a été retiré du groupe.",
    en: "⏱️ *{name}* did not accept the rules in time and was removed from the group.",
    es: "⏱️ *{name}* no aceptó las normas a tiempo y fue eliminado del grupo.",
    pt: "⏱️ *{name}* não aceitou as regras a tempo e foi removido do grupo.",
    ar: "⏱️ لم يقبل *{name}* القواعد في الوقت المحدد وتمت إزالته من المجموعة.",
  },
  verify_not_for_you: {
    fr: "❌ Ce bouton n'est pas pour vous.",
    en: "❌ This button is not for you.",
    es: "❌ Este botón no es para ti.",
    pt: "❌ Este botão não é para você.",
    ar: "❌ هذا الزر ليس لك.",
  },
  verify_welcome_btn: {
    fr: "✅ Bienvenue dans le groupe !",
    en: "✅ Welcome to the group!",
    es: "✅ ¡Bienvenido/a al grupo!",
    pt: "✅ Bem-vindo(a) ao grupo!",
    ar: "✅ مرحباً بك في المجموعة!",
  },
  // ── Ajout du bot au groupe ────────────────────────────────────────────────
  bot_added_admin: {
    fr: "👋 *Bonjour ! Je suis votre bot modérateur.*\n\n✅ J'ai les droits d'administrateur.\n\n🔴 *Je suis actuellement inactif.*\nLa modération ne commencera pas tant qu'un administrateur ne m'aura pas configuré et activé.\n\n*Par où commencer ?*\n• Appuyez sur *\"📋 Définir les règles\"* pour écrire les règles du groupe\n• Ou appuyez sur *\"⚙️ Paramètres\"* pour tout configurer",
    en: "👋 *Hello! I am your moderator bot.*\n\n✅ I have administrator rights.\n\n🔴 *I am currently inactive.*\nModeration will not start until an administrator configures and enables me.\n\n*Where to start?*\n• Press *\"📋 Set rules\"* to write the group rules\n• Or press *\"⚙️ Settings\"* to configure everything",
    es: "👋 *¡Hola! Soy tu bot moderador.*\n\n✅ Tengo derechos de administrador.\n\n🔴 *Actualmente estoy inactivo.*\nLa moderación no comenzará hasta que un administrador me configure y active.\n\n*¿Por dónde empezar?*\n• Presiona *\"📋 Definir reglas\"* para escribir las reglas del grupo\n• O presiona *\"⚙️ Ajustes\"* para configurar todo",
    pt: "👋 *Olá! Sou seu bot moderador.*\n\n✅ Tenho direitos de administrador.\n\n🔴 *Estou atualmente inativo.*\nA moderação não começará até que um administrador me configure e ative.\n\n*Por onde começar?*\n• Pressione *\"📋 Definir regras\"* para escrever as regras do grupo\n• Ou pressione *\"⚙️ Configurações\"* para configurar tudo",
    ar: "👋 *مرحباً! أنا بوت الإدارة الخاص بكم.*\n\n✅ لدي صلاحيات المشرف.\n\n🔴 *أنا غير نشط حالياً.*\nلن تبدأ الإدارة حتى يقوم أحد المشرفين بإعدادي وتفعيلي.\n\n*من أين تبدأ؟*\n• اضغط على *\"📋 تحديد القواعد\"* لكتابة قواعد المجموعة\n• أو اضغط على *\"⚙️ الإعدادات\"* لتكوين كل شيء",
  },
  bot_added_no_admin: {
    fr: "👋 *Bonjour ! Je suis votre bot modérateur.*\n\n⚠️ *Je n'ai pas encore les droits d'administrateur.*\nMerci de m'en accorder pour pouvoir modérer.\n\n🔴 *Je suis actuellement inactif.*\nLa modération ne commencera pas tant qu'un administrateur ne m'aura pas configuré et activé.\n\n*Par où commencer ?*\n• Appuyez sur *\"📋 Définir les règles\"* pour écrire les règles du groupe\n• Ou appuyez sur *\"⚙️ Paramètres\"* pour tout configurer",
    en: "👋 *Hello! I am your moderator bot.*\n\n⚠️ *I don't have administrator rights yet.*\nPlease grant them so I can moderate.\n\n🔴 *I am currently inactive.*\nModeration will not start until an administrator configures and enables me.\n\n*Where to start?*\n• Press *\"📋 Set rules\"* to write the group rules\n• Or press *\"⚙️ Settings\"* to configure everything",
    es: "👋 *¡Hola! Soy tu bot moderador.*\n\n⚠️ *Aún no tengo derechos de administrador.*\nPor favor, concédemelos para poder moderar.\n\n🔴 *Actualmente estoy inactivo.*\nLa moderación no comenzará hasta que un administrador me configure y active.\n\n*¿Por dónde empezar?*\n• Presiona *\"📋 Definir reglas\"* para escribir las reglas del grupo\n• O presiona *\"⚙️ Ajustes\"* para configurar todo",
    pt: "👋 *Olá! Sou seu bot moderador.*\n\n⚠️ *Ainda não tenho direitos de administrador.*\nPor favor, conceda-os para que eu possa moderar.\n\n🔴 *Estou atualmente inativo.*\nA moderação não começará até que um administrador me configure e ative.\n\n*Por onde começar?*\n• Pressione *\"📋 Definir regras\"* para escrever as regras do grupo\n• Ou pressione *\"⚙️ Configurações\"* para configurar tudo",
    ar: "👋 *مرحباً! أنا بوت الإدارة الخاص بكم.*\n\n⚠️ *ليس لدي صلاحيات المشرف بعد.*\nيرجى منحي إياها حتى أتمكن من الإدارة.\n\n🔴 *أنا غير نشط حالياً.*\nلن تبدأ الإدارة حتى يقوم أحد المشرفين بإعدادي وتفعيلي.\n\n*من أين تبدأ؟*\n• اضغط على *\"📋 تحديد القواعد\"* لكتابة قواعد المجموعة\n• أو اضغط على *\"⚙️ الإعدادات\"* لتكوين كل شيء",
  },
  btn_set_rules: {
    fr: "📋 Définir les règles du groupe",
    en: "📋 Set group rules",
    es: "📋 Definir reglas del grupo",
    pt: "📋 Definir regras do grupo",
    ar: "📋 تحديد قواعد المجموعة",
  },
  btn_open_settings: {
    fr: "⚙️ Ouvrir les paramètres",
    en: "⚙️ Open settings",
    es: "⚙️ Abrir ajustes",
    pt: "⚙️ Abrir configurações",
    ar: "⚙️ فتح الإعدادات",
  },
  // ── Commandes ─────────────────────────────────────────────────────────────
  rules_not_set: {
    fr: "📋 Aucune règle n'a encore été définie pour ce groupe.",
    en: "📋 No rules have been set for this group yet.",
    es: "📋 Aún no se han definido reglas para este grupo.",
    pt: "📋 Nenhuma regra foi definida para este grupo ainda.",
    ar: "📋 لم يتم تحديد أي قواعد لهذه المجموعة بعد.",
  },
  rules_header: {
    fr: "📋 *Règles du groupe*\n\n{rules}",
    en: "📋 *Group Rules*\n\n{rules}",
    es: "📋 *Reglas del grupo*\n\n{rules}",
    pt: "📋 *Regras do grupo*\n\n{rules}",
    ar: "📋 *قواعد المجموعة*\n\n{rules}",
  },
  // ── Sélection de langue ────────────────────────────────────────────────────
  lang_select_title: {
    fr: "🌍 *Choisissez votre langue*\n\nLa langue sélectionnée sera utilisée pour vos interactions avec le bot.",
    en: "🌍 *Choose your language*\n\nThe selected language will be used for your interactions with the bot.",
    es: "🌍 *Elige tu idioma*\n\nEl idioma seleccionado se usará en tus interacciones con el bot.",
    pt: "🌍 *Escolha seu idioma*\n\nO idioma selecionado será usado para suas interações com o bot.",
    ar: "🌍 *اختر لغتك*\n\nسيتم استخدام اللغة المحددة في تفاعلاتك مع البوت.",
  },
  lang_group_select_title: {
    fr: "🌍 *Langue du groupe*\n\nTous les messages du bot dans ce groupe seront dans la langue sélectionnée.\n\nLangue actuelle : {lang}",
    en: "🌍 *Group language*\n\nAll bot messages in this group will be in the selected language.\n\nCurrent language: {lang}",
    es: "🌍 *Idioma del grupo*\n\nTodos los mensajes del bot en este grupo estarán en el idioma seleccionado.\n\nIdioma actual: {lang}",
    pt: "🌍 *Idioma do grupo*\n\nTodas as mensagens do bot neste grupo estarão no idioma selecionado.\n\nIdioma atual: {lang}",
    ar: "🌍 *لغة المجموعة*\n\nستكون جميع رسائل البوت في هذه المجموعة باللغة المحددة.\n\nاللغة الحالية: {lang}",
  },
  lang_saved: {
    fr: "✅ Langue mise à jour : {lang}",
    en: "✅ Language updated: {lang}",
    es: "✅ Idioma actualizado: {lang}",
    pt: "✅ Idioma atualizado: {lang}",
    ar: "✅ تم تحديث اللغة: {lang}",
  },
  // ── /start en privé ───────────────────────────────────────────────────────
  start_private: {
    fr: "🤖 *Bot Modérateur Telegram*\n\nAjoutez-moi à votre groupe, donnez-moi les droits d'administrateur, puis tapez /settings pour configurer et activer la modération.\n\n/settings — ⚙️ Paramètres\n/language — 🌍 Changer de langue\n/help — ❓ Aide complète",
    en: "🤖 *Telegram Moderator Bot*\n\nAdd me to your group, grant me administrator rights, then type /settings to configure and enable moderation.\n\n/settings — ⚙️ Settings\n/language — 🌍 Change language\n/help — ❓ Full help",
    es: "🤖 *Bot Moderador de Telegram*\n\nAgrégame a tu grupo, otórgame derechos de administrador, luego escribe /settings para configurar y activar la moderación.\n\n/settings — ⚙️ Configuración\n/language — 🌍 Cambiar idioma\n/help — ❓ Ayuda completa",
    pt: "🤖 *Bot Moderador do Telegram*\n\nMe adicione ao seu grupo, conceda direitos de administrador, depois digite /settings para configurar e ativar a moderação.\n\n/settings — ⚙️ Configurações\n/language — 🌍 Mudar idioma\n/help — ❓ Ajuda completa",
    ar: "🤖 *بوت الإدارة في تيليغرام*\n\nأضفني إلى مجموعتك، امنحني صلاحيات المشرف، ثم اكتب /settings لتكوين الإدارة وتفعيلها.\n\n/settings — ⚙️ الإعدادات\n/language — 🌍 تغيير اللغة\n/help — ❓ المساعدة الكاملة",
  },
};

export function t(lang: string, key: string, vars: Record<string, string | number> = {}): string {
  const langMap = translations[key];
  if (!langMap) return key;
  const raw = langMap[lang] ?? langMap["fr"] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
