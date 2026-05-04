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
  btn_configure_private: {
    fr: "🔒 Configurer en privé",
    en: "🔒 Configure in private",
    es: "🔒 Configurar en privado",
    pt: "🔒 Configurar em privado",
    ar: "🔒 الإعداد في الخاص",
  },
  btn_configure_here: {
    fr: "⚙️ Configurer ici",
    en: "⚙️ Configure here",
    es: "⚙️ Configurar aquí",
    pt: "⚙️ Configurar aqui",
    ar: "⚙️ الإعداد هنا",
  },
  setup_private_not_admin: {
    fr: "❌ Vous devez être *administrateur* de ce groupe pour le configurer.",
    en: "❌ You must be an *administrator* of this group to configure it.",
    es: "❌ Debes ser *administrador* de este grupo para configurarlo.",
    pt: "❌ Você precisa ser *administrador* deste grupo para configurá-lo.",
    ar: "❌ يجب أن تكون *مشرفاً* في هذه المجموعة لتتمكن من إعدادها.",
  },
  setup_private_group_not_found: {
    fr: "❌ Groupe introuvable. Assurez-vous que le bot est bien dans le groupe.",
    en: "❌ Group not found. Make sure the bot is still in the group.",
    es: "❌ Grupo no encontrado. Asegúrate de que el bot sigue en el grupo.",
    pt: "❌ Grupo não encontrado. Certifique-se de que o bot ainda está no grupo.",
    ar: "❌ المجموعة غير موجودة. تأكد من أن البوت لا يزال في المجموعة.",
  },
  setup_private_intro: {
    fr: "🔧 *Configuration de \"{title}\"*\n\nTous les changements sont appliqués immédiatement dans le groupe.",
    en: "🔧 *Configuration of \"{title}\"*\n\nAll changes are applied immediately in the group.",
    es: "🔧 *Configuración de \"{title}\"*\n\nTodos los cambios se aplican inmediatamente en el grupo.",
    pt: "🔧 *Configuração de \"{title}\"*\n\nTodas as alterações são aplicadas imediatamente no grupo.",
    ar: "🔧 *إعداد \"{title}\"*\n\nيتم تطبيق جميع التغييرات فوراً في المجموعة.",
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
  // ── Canal obligatoire ─────────────────────────────────────────────────────
  required_channel_msg: {
    fr: "🔒 *Accès restreint*\n\nPour écrire dans ce groupe, vous devez d'abord rejoindre notre canal.",
    en: "🔒 *Access restricted*\n\nTo write in this group, you must first join our channel.",
    es: "🔒 *Acceso restringido*\n\nPara escribir en este grupo, primero debes unirte a nuestro canal.",
    pt: "🔒 *Acesso restrito*\n\nPara escrever neste grupo, você deve primeiro entrar em nosso canal.",
    ar: "🔒 *الوصول مقيد*\n\nللكتابة في هذه المجموعة، يجب عليك أولاً الانضمام إلى قناتنا.",
  },
  required_channel_btn: {
    fr: "📢 Rejoindre le canal",
    en: "📢 Join the channel",
    es: "📢 Unirse al canal",
    pt: "📢 Entrar no canal",
    ar: "📢 انضم إلى القناة",
  },
  // ── Messages communs ─────────────────────────────────────────────────────
  admin_only: {
    fr: "❌ Réservé aux administrateurs.",
    en: "❌ Admin only.",
    es: "❌ Solo administradores.",
    pt: "❌ Apenas administradores.",
    ar: "❌ للمشرفين فقط.",
  },
  settings_in_group: {
    fr: "ℹ️ Utilisez /settings directement dans votre groupe.",
    en: "ℹ️ Use /settings directly in your group.",
    es: "ℹ️ Usa /settings directamente en tu grupo.",
    pt: "ℹ️ Use /settings diretamente no seu grupo.",
    ar: "ℹ️ استخدم /settings مباشرة في مجموعتك.",
  },
  settings_load_error: {
    fr: "❌ Erreur lors du chargement des paramètres.",
    en: "❌ Error loading settings.",
    es: "❌ Error al cargar los ajustes.",
    pt: "❌ Erro ao carregar as configurações.",
    ar: "❌ خطأ في تحميل الإعدادات.",
  },
  language_in_private: {
    fr: "🌍 Utilisez `/language` en message privé avec le bot pour changer votre langue personnelle.",
    en: "🌍 Use `/language` in a private message with the bot to change your personal language.",
    es: "🌍 Usa `/language` en un mensaje privado con el bot para cambiar tu idioma.",
    pt: "🌍 Use `/language` em mensagem privada com o bot para mudar seu idioma.",
    ar: "🌍 استخدم `/language` في رسالة خاصة مع البوت لتغيير لغتك.",
  },
  no_reply: {
    fr: "↩️ Répondez au message d'un utilisateur pour utiliser cette commande.",
    en: "↩️ Reply to a user's message to use this command.",
    es: "↩️ Responde al mensaje de un usuario para usar este comando.",
    pt: "↩️ Responda à mensagem de um usuário para usar este comando.",
    ar: "↩️ رد على رسالة مستخدم لاستخدام هذا الأمر.",
  },
  cannot_target_bot: {
    fr: "❌ Cette commande ne peut pas être utilisée sur un bot.",
    en: "❌ This command cannot be used on a bot.",
    es: "❌ Este comando no se puede usar en un bot.",
    pt: "❌ Este comando não pode ser usado em um bot.",
    ar: "❌ لا يمكن استخدام هذا الأمر على بوت.",
  },
  // ── /help ─────────────────────────────────────────────────────────────────
  help_text: {
    fr: "🛡️ *Commandes du bot modérateur*\n\n⚙️ *Configuration (admins) :*\n/settings — Paramètres & activer/désactiver\n/setwelcome [texte] — Message de bienvenue\n/setrules [texte] — Règles du groupe\n\n👮 *Modération (admins) :*\n/warn (répondre) [raison] — Avertir\n/unwarn (répondre) — Retirer avertissement\n/ban (répondre) [raison] — Bannir\n/unban (répondre) — Débannir\n/kick (répondre) — Expulser\n/mute (répondre) [min] — Rendre muet\n/unmute (répondre) — Lever le silence\n\n🔤 *Filtres de mots (admins) :*\n/filter mot [action] — Ajouter un mot interdit\n/filters — Voir et gérer tous les filtres\n\n📊 *Informations :*\n/warnings (répondre) — Voir les avertissements\n/rules — Afficher les règles\n/stats — Statistiques du groupe",
    en: "🛡️ *Moderator bot commands*\n\n⚙️ *Configuration (admins):*\n/settings — Settings & enable/disable\n/setwelcome [text] — Welcome message\n/setrules [text] — Group rules\n\n👮 *Moderation (admins):*\n/warn (reply) [reason] — Warn\n/unwarn (reply) — Remove warning\n/ban (reply) [reason] — Ban\n/unban (reply) — Unban\n/kick (reply) — Kick\n/mute (reply) [min] — Mute\n/unmute (reply) — Unmute\n\n🔤 *Word filters (admins):*\n/filter word [action] — Add forbidden word\n/filters — View and manage filters\n\n📊 *Information:*\n/warnings (reply) — View warnings\n/rules — Display rules\n/stats — Group statistics",
    es: "🛡️ *Comandos del bot moderador*\n\n⚙️ *Configuración (admins):*\n/settings — Ajustes y activar/desactivar\n/setwelcome [texto] — Mensaje de bienvenida\n/setrules [texto] — Reglas del grupo\n\n👮 *Moderación (admins):*\n/warn (responder) [razón] — Advertir\n/unwarn (responder) — Quitar advertencia\n/ban (responder) [razón] — Bannear\n/unban (responder) — Quitar ban\n/kick (responder) — Expulsar\n/mute (responder) [min] — Silenciar\n/unmute (responder) — Levantar silencio\n\n🔤 *Filtros de palabras (admins):*\n/filter palabra [acción] — Añadir palabra prohibida\n/filters — Ver y gestionar filtros\n\n📊 *Información:*\n/warnings (responder) — Ver advertencias\n/rules — Ver reglas\n/stats — Estadísticas del grupo",
    pt: "🛡️ *Comandos do bot moderador*\n\n⚙️ *Configuração (admins):*\n/settings — Configurações e ativar/desativar\n/setwelcome [texto] — Mensagem de boas-vindas\n/setrules [texto] — Regras do grupo\n\n👮 *Moderação (admins):*\n/warn (responder) [motivo] — Avisar\n/unwarn (responder) — Remover aviso\n/ban (responder) [motivo] — Banir\n/unban (responder) — Desbanir\n/kick (responder) — Expulsar\n/mute (responder) [min] — Silenciar\n/unmute (responder) — Remover silêncio\n\n🔤 *Filtros de palavras (admins):*\n/filter palavra [ação] — Adicionar palavra proibida\n/filters — Ver e gerir filtros\n\n📊 *Informações:*\n/warnings (responder) — Ver avisos\n/rules — Exibir regras\n/stats — Estatísticas do grupo",
    ar: "🛡️ *أوامر بوت الإدارة*\n\n⚙️ *الإعداد (المشرفون):*\n/settings — الإعدادات والتفعيل\n/setwelcome [نص] — رسالة الترحيب\n/setrules [نص] — قواعد المجموعة\n\n👮 *الإدارة (المشرفون):*\n/warn (رد) [سبب] — تحذير\n/unwarn (رد) — إزالة تحذير\n/ban (رد) [سبب] — حظر\n/unban (رد) — رفع الحظر\n/kick (رد) — طرد\n/mute (رد) [دقائق] — كتم\n/unmute (رد) — رفع الكتم\n\n🔤 *فلاتر الكلمات (المشرفون):*\n/filter كلمة [إجراء] — إضافة كلمة محظورة\n/filters — عرض وإدارة الفلاتر\n\n📊 *المعلومات:*\n/warnings (رد) — عرض التحذيرات\n/rules — عرض القواعد\n/stats — إحصاءات المجموعة",
  },
  // ── /setrules ─────────────────────────────────────────────────────────────
  setrules_usage: {
    fr: "📝 *Utilisation :* `/setrules 1. Soyez respectueux\\n2. Pas de spam...`\n\nSéparez les règles par `\\n`.",
    en: "📝 *Usage:* `/setrules 1. Be respectful\\n2. No spam...`\n\nSeparate rules with `\\n`.",
    es: "📝 *Uso:* `/setrules 1. Sé respetuoso\\n2. Sin spam...`\n\nSepara las reglas con `\\n`.",
    pt: "📝 *Uso:* `/setrules 1. Seja respeitoso\\n2. Sem spam...`\n\nSepare as regras com `\\n`.",
    ar: "📝 *الاستخدام:* `/setrules 1. كن محترماً\\n2. لا للرسائل المزعجة...`\n\nافصل القواعد بـ `\\n`.",
  },
  setrules_updated: {
    fr: "✅ *Règles mises à jour !* Tapez /rules pour les afficher.",
    en: "✅ *Rules updated!* Type /rules to display them.",
    es: "✅ *¡Reglas actualizadas!* Escribe /rules para mostrarlas.",
    pt: "✅ *Regras atualizadas!* Digite /rules para exibi-las.",
    ar: "✅ *تم تحديث القواعد!* اكتب /rules لعرضها.",
  },
  // ── /setwelcome ───────────────────────────────────────────────────────────
  setwelcome_usage: {
    fr: "📝 *Utilisation :* `/setwelcome Bienvenue {name} dans {group} !`\n\nVariables : `{name}` = prénom, `{group}` = nom du groupe",
    en: "📝 *Usage:* `/setwelcome Welcome {name} to {group}!`\n\nVariables: `{name}` = first name, `{group}` = group name",
    es: "📝 *Uso:* `/setwelcome Bienvenido {name} a {group}!`\n\nVariables: `{name}` = nombre, `{group}` = nombre del grupo",
    pt: "📝 *Uso:* `/setwelcome Bem-vindo {name} ao {group}!`\n\nVariáveis: `{name}` = nome, `{group}` = nome do grupo",
    ar: "📝 *الاستخدام:* `/setwelcome مرحباً {name} في {group}!`\n\nالمتغيرات: `{name}` = الاسم, `{group}` = اسم المجموعة",
  },
  setwelcome_updated: {
    fr: "✅ *Message de bienvenue mis à jour !*\n\n_Aperçu :_\n{preview}",
    en: "✅ *Welcome message updated!*\n\n_Preview:_\n{preview}",
    es: "✅ *¡Mensaje de bienvenida actualizado!*\n\n_Vista previa:_\n{preview}",
    pt: "✅ *Mensagem de boas-vindas atualizada!*\n\n_Pré-visualização:_\n{preview}",
    ar: "✅ *تم تحديث رسالة الترحيب!*\n\n_معاينة:_\n{preview}",
  },
  // ── /warn ─────────────────────────────────────────────────────────────────
  warn_success: {
    fr: "⚠️ *Avertissement* pour *{name}*\n📝 Raison : {reason}\n🔢 Total : {count}/{max}",
    en: "⚠️ *Warning* for *{name}*\n📝 Reason: {reason}\n🔢 Total: {count}/{max}",
    es: "⚠️ *Advertencia* para *{name}*\n📝 Razón: {reason}\n🔢 Total: {count}/{max}",
    pt: "⚠️ *Aviso* para *{name}*\n📝 Motivo: {reason}\n🔢 Total: {count}/{max}",
    ar: "⚠️ *تحذير* لـ *{name}*\n📝 السبب: {reason}\n🔢 الإجمالي: {count}/{max}",
  },
  warn_before_ban: {
    fr: "⚠️ *Avertissement* pour *{name}*\n📝 {reason}\n🔢 {count}/{max} — *Ban automatique en cours...*",
    en: "⚠️ *Warning* for *{name}*\n📝 {reason}\n🔢 {count}/{max} — *Auto-ban in progress...*",
    es: "⚠️ *Advertencia* para *{name}*\n📝 {reason}\n🔢 {count}/{max} — *Ban automático en curso...*",
    pt: "⚠️ *Aviso* para *{name}*\n📝 {reason}\n🔢 {count}/{max} — *Ban automático em andamento...*",
    ar: "⚠️ *تحذير* لـ *{name}*\n📝 {reason}\n🔢 {count}/{max} — *الحظر التلقائي جارٍ...*",
  },
  warn_max_ban: {
    fr: "🔨 *{name}* banni (max d'avertissements déjà atteint).",
    en: "🔨 *{name}* banned (max warnings already reached).",
    es: "🔨 *{name}* baneado (máximo de advertencias ya alcanzado).",
    pt: "🔨 *{name}* banido (máximo de avisos já atingido).",
    ar: "🔨 تم حظر *{name}* (تم الوصول إلى الحد الأقصى من التحذيرات).",
  },
  warn_autoban: {
    fr: "🔨 *{name}* banni après {max} avertissements.",
    en: "🔨 *{name}* banned after {max} warnings.",
    es: "🔨 *{name}* baneado tras {max} advertencias.",
    pt: "🔨 *{name}* banido após {max} avisos.",
    ar: "🔨 تم حظر *{name}* بعد {max} تحذيرات.",
  },
  // ── /ban ─────────────────────────────────────────────────────────────────
  ban_success: {
    fr: "🔨 *{name}* banni.\n📝 Raison : {reason}",
    en: "🔨 *{name}* banned.\n📝 Reason: {reason}",
    es: "🔨 *{name}* baneado.\n📝 Razón: {reason}",
    pt: "🔨 *{name}* banido.\n📝 Motivo: {reason}",
    ar: "🔨 تم حظر *{name}*.\n📝 السبب: {reason}",
  },
  ban_error: {
    fr: "❌ Impossible de bannir. Vérifiez mes droits d'administrateur.",
    en: "❌ Cannot ban. Check my administrator rights.",
    es: "❌ No se puede bannear. Verifica mis derechos de administrador.",
    pt: "❌ Não é possível banir. Verifique meus direitos de administrador.",
    ar: "❌ لا يمكن الحظر. تحقق من صلاحياتي كمشرف.",
  },
  // ── /unban ────────────────────────────────────────────────────────────────
  unban_success: {
    fr: "✅ *{name}* débanni.",
    en: "✅ *{name}* unbanned.",
    es: "✅ *{name}* desbaneado.",
    pt: "✅ *{name}* desbanido.",
    ar: "✅ تم رفع الحظر عن *{name}*.",
  },
  unban_error: {
    fr: "❌ Impossible de débannir.",
    en: "❌ Cannot unban.",
    es: "❌ No se puede quitar el ban.",
    pt: "❌ Não é possível desbanir.",
    ar: "❌ لا يمكن رفع الحظر.",
  },
  // ── /kick ─────────────────────────────────────────────────────────────────
  kick_success: {
    fr: "👢 *{name}* expulsé du groupe.",
    en: "👢 *{name}* kicked from the group.",
    es: "👢 *{name}* expulsado del grupo.",
    pt: "👢 *{name}* expulso do grupo.",
    ar: "👢 تم طرد *{name}* من المجموعة.",
  },
  kick_error: {
    fr: "❌ Impossible d'expulser cet utilisateur.",
    en: "❌ Cannot kick this user.",
    es: "❌ No se puede expulsar a este usuario.",
    pt: "❌ Não é possível expulsar este usuário.",
    ar: "❌ لا يمكن طرد هذا المستخدم.",
  },
  // ── /mute ─────────────────────────────────────────────────────────────────
  mute_success: {
    fr: "🔇 *{name}* muet pour *{min} minutes*.",
    en: "🔇 *{name}* muted for *{min} minutes*.",
    es: "🔇 *{name}* silenciado por *{min} minutos*.",
    pt: "🔇 *{name}* silenciado por *{min} minutos*.",
    ar: "🔇 تم كتم *{name}* لمدة *{min} دقيقة*.",
  },
  mute_error: {
    fr: "❌ Impossible de rendre muet. Vérifiez mes droits d'administrateur.",
    en: "❌ Cannot mute. Check my administrator rights.",
    es: "❌ No se puede silenciar. Verifica mis derechos de administrador.",
    pt: "❌ Não é possível silenciar. Verifique meus direitos de administrador.",
    ar: "❌ لا يمكن الكتم. تحقق من صلاحياتي كمشرف.",
  },
  // ── /unmute ───────────────────────────────────────────────────────────────
  unmute_success: {
    fr: "🔊 *{name}* peut de nouveau parler.",
    en: "🔊 *{name}* can speak again.",
    es: "🔊 *{name}* puede hablar de nuevo.",
    pt: "🔊 *{name}* pode falar novamente.",
    ar: "🔊 يمكن لـ *{name}* التحدث مجدداً.",
  },
  unmute_error: {
    fr: "❌ Impossible de lever le silence.",
    en: "❌ Cannot unmute.",
    es: "❌ No se puede levantar el silencio.",
    pt: "❌ Não é possível remover o silêncio.",
    ar: "❌ لا يمكن رفع الكتم.",
  },
  // ── /warnings ─────────────────────────────────────────────────────────────
  warnings_none: {
    fr: "✅ *{name}* n'a aucun avertissement.",
    en: "✅ *{name}* has no warnings.",
    es: "✅ *{name}* no tiene advertencias.",
    pt: "✅ *{name}* não tem avisos.",
    ar: "✅ لا توجد تحذيرات لـ *{name}*.",
  },
  warnings_list: {
    fr: "⚠️ *Avertissements de {name}* : {count}/{max}\n\n{list}",
    en: "⚠️ *Warnings for {name}*: {count}/{max}\n\n{list}",
    es: "⚠️ *Advertencias de {name}*: {count}/{max}\n\n{list}",
    pt: "⚠️ *Avisos de {name}*: {count}/{max}\n\n{list}",
    ar: "⚠️ *تحذيرات {name}*: {count}/{max}\n\n{list}",
  },
  // ── /unwarn ───────────────────────────────────────────────────────────────
  unwarn_none: {
    fr: "✅ *{name}* n'a aucun avertissement à retirer.",
    en: "✅ *{name}* has no warnings to remove.",
    es: "✅ *{name}* no tiene advertencias para quitar.",
    pt: "✅ *{name}* não tem avisos para remover.",
    ar: "✅ لا توجد تحذيرات لإزالتها من *{name}*.",
  },
  unwarn_success: {
    fr: "✅ Dernier avertissement de *{name}* retiré.",
    en: "✅ Last warning for *{name}* removed.",
    es: "✅ Última advertencia de *{name}* eliminada.",
    pt: "✅ Último aviso de *{name}* removido.",
    ar: "✅ تمت إزالة آخر تحذير من *{name}*.",
  },
  // ── /stats ────────────────────────────────────────────────────────────────
  stats_text: {
    fr: "📊 *Statistiques — {group}*\n\n⚠️ Avertissements : {warns}\n🔨 Bans actifs : {bans}\n🚨 Violations totales : {violations}",
    en: "📊 *Statistics — {group}*\n\n⚠️ Warnings: {warns}\n🔨 Active bans: {bans}\n🚨 Total violations: {violations}",
    es: "📊 *Estadísticas — {group}*\n\n⚠️ Advertencias: {warns}\n🔨 Bans activos: {bans}\n🚨 Violaciones totales: {violations}",
    pt: "📊 *Estatísticas — {group}*\n\n⚠️ Avisos: {warns}\n🔨 Bans ativos: {bans}\n🚨 Violações totais: {violations}",
    ar: "📊 *الإحصاءات — {group}*\n\n⚠️ التحذيرات: {warns}\n🔨 الحظر النشط: {bans}\n🚨 إجمالي الانتهاكات: {violations}",
  },
  // ── /filter ───────────────────────────────────────────────────────────────
  filter_usage: {
    fr: "📝 *Ajouter un mot interdit*\n\nUsage : `/filter mot [action]`\n\nActions : `delete` (défaut), `warn`, `mute`, `ban`\n\nExemples :\n`/filter arnaque`\n`/filter casino ban`",
    en: "📝 *Add a forbidden word*\n\nUsage: `/filter word [action]`\n\nActions: `delete` (default), `warn`, `mute`, `ban`\n\nExamples:\n`/filter scam`\n`/filter casino ban`",
    es: "📝 *Añadir palabra prohibida*\n\nUso: `/filter palabra [acción]`\n\nAcciones: `delete` (defecto), `warn`, `mute`, `ban`\n\nEjemplos:\n`/filter estafa`\n`/filter casino ban`",
    pt: "📝 *Adicionar palavra proibida*\n\nUso: `/filter palavra [ação]`\n\nAções: `delete` (padrão), `warn`, `mute`, `ban`\n\nExemplos:\n`/filter golpe`\n`/filter casino ban`",
    ar: "📝 *إضافة كلمة محظورة*\n\nالاستخدام: `/filter كلمة [إجراء]`\n\nالإجراءات: `delete` (افتراضي), `warn`, `mute`, `ban`\n\nأمثلة:\n`/filter احتيال`\n`/filter casino ban`",
  },
  filter_added: {
    fr: "✅ Mot *\"{word}\"* ajouté aux filtres.\nAction : {action}",
    en: "✅ Word *\"{word}\"* added to filters.\nAction: {action}",
    es: "✅ Palabra *\"{word}\"* añadida a los filtros.\nAcción: {action}",
    pt: "✅ Palavra *\"{word}\"* adicionada aos filtros.\nAção: {action}",
    ar: "✅ تمت إضافة الكلمة *\"{word}\"* إلى الفلاتر.\nالإجراء: {action}",
  },
  filter_updated: {
    fr: "✅ Mot *\"{word}\"* mis à jour — Action : {action}",
    en: "✅ Word *\"{word}\"* updated — Action: {action}",
    es: "✅ Palabra *\"{word}\"* actualizada — Acción: {action}",
    pt: "✅ Palavra *\"{word}\"* atualizada — Ação: {action}",
    ar: "✅ تم تحديث الكلمة *\"{word}\"* — الإجراء: {action}",
  },
  filters_empty: {
    fr: "📋 *Aucun filtre de mots configuré.*\n\nAjoutez des mots avec `/filter mot [action]`.",
    en: "📋 *No word filters configured.*\n\nAdd words with `/filter word [action]`.",
    es: "📋 *No hay filtros de palabras configurados.*\n\nAgrega palabras con `/filter palabra [acción]`.",
    pt: "📋 *Nenhum filtro de palavras configurado.*\n\nAdicione palavras com `/filter palavra [ação]`.",
    ar: "📋 *لا توجد فلاتر كلمات مضبوطة.*\n\nأضف كلمات بـ `/filter كلمة [إجراء]`.",
  },
  // ── Commandes réservées aux groupes ──────────────────────────────────────
  group_only_cmd: {
    fr: "🛡️ *Cette commande fonctionne uniquement dans un groupe.*\n\nAjoutez-moi à votre groupe en tant qu'administrateur, puis utilisez cette commande là-bas.\n\n👉 /start — pour commencer",
    en: "🛡️ *This command only works in a group.*\n\nAdd me to your group as an administrator, then use this command there.\n\n👉 /start — to get started",
    es: "🛡️ *Este comando solo funciona en un grupo.*\n\nAgrégame a tu grupo como administrador y usa este comando allí.\n\n👉 /start — para comenzar",
    pt: "🛡️ *Este comando só funciona em um grupo.*\n\nAdicione-me ao seu grupo como administrador e use este comando lá.\n\n👉 /start — para começar",
    ar: "🛡️ *هذا الأمر يعمل فقط في المجموعات.*\n\nأضفني إلى مجموعتك كمشرف ثم استخدم هذا الأمر هناك.\n\n👉 /start — للبدء",
  },
  // ── Bouton ajouter dans un groupe ────────────────────────────────────────
  add_to_group_btn: {
    fr: "➕ Ajouter dans un groupe",
    en: "➕ Add to a group",
    es: "➕ Agregar a un grupo",
    pt: "➕ Adicionar a um grupo",
    ar: "➕ إضافة إلى مجموعة",
  },
  btn_support: {
    fr: "💬 Support",
    en: "💬 Support",
    es: "💬 Soporte",
    pt: "💬 Suporte",
    ar: "💬 الدعم",
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
