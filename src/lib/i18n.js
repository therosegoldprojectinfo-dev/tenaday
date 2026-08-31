export const translations = {
  en: {
    dir: 'ltr',
    // Nav
    nav_chapters: 'Chapters',
    nav_rewards: 'Rewards',
    nav_parent_zone: 'Parent Zone',
    nav_streak_days: (n) => `${n} day${n !== 1 ? 's' : ''}`,
    nav_current_streak: 'Current streak ⚡',

    // Chapters
    chapters_add: '+ Add chapter',
    chapters_empty_title: 'No chapters yet',
    chapters_empty_sub: 'Create your first chapter to start learning!',
    chapters_empty_cta: 'Set up my first chapter',
    chapters_tap: 'Tap to study →',
    chapters_modal_title: 'New Chapter',
    chapters_modal_name_label: 'Chapter name',
    chapters_modal_name_placeholder: 'e.g. Math, French, Science...',
    chapters_modal_icon_label: 'Pick an icon',
    chapters_modal_preview: 'Preview',
    chapters_modal_cta: 'Create Chapter →',
    chapters_modal_creating: 'Creating...',
    chapters_modal_cancel: 'Cancel',

    // CurrentChapter
    current_back: '← Back',
    current_exams_saved: (n) => `${n} exam${n !== 1 ? 's' : ''} saved`,
    current_new: 'New',
    current_revision: 'Revision',
    current_no_exams: 'No exams yet',
    current_recent: 'RECENT EXAMS',
    current_more: (n) => `+${n} more in Revision`,
    current_questions: (n) => `${n} questions`,

    // Home (Scan)
    home_back: '← Back',
    home_snap: 'Snap your notes or textbook 📸',
    home_cta: '📸 Take Photo or Select',
    home_generating: 'Generating your quiz...',
    home_reading: 'Numio is reading the image ✨',
    home_error_title: 'Something went wrong',
    home_try_again: 'Try Again',

    // Revision
    revision_back: '← Back',
    revision_title: 'Revision',
    revision_exam: (n) => `${n} exam${n !== 1 ? 's' : ''}`,
    revision_original: 'Original',
    revision_version: (n) => `v${n}`,
    revision_no_page_text: 'New questions not available for older exams',

    // QuizIntro
    quiz_intro_lets_start: "let's start!",
    quiz_intro_you_can: 'You can do this! 💪',
    quiz_intro_questions: (n) => `${n} questions`,
    quiz_intro_start: 'START →',
    quiz_intro_new_questions: '✨ New Questions',
    quiz_intro_generating: 'Generating new questions...',
    quiz_intro_no_page_text: "This exam was created before revision was supported. Scan a new page to use this feature.",
    quiz_intro_rate_limit: "You've reached today's quiz limit. Come back tomorrow!",
    quiz_intro_error: 'Something went wrong. Please try again.',

    // Quiz
    quiz_check: 'CHECK',
    quiz_continue: 'CONTINUE →',
    quiz_saving: 'Saving...',
    quiz_correct: 'Correct!',
    quiz_not_quite: 'Not quite!',
    quiz_correct_answer: (a) => `✓ Correct answer: ${a}`,
    quiz_fill_placeholder: 'Type your answer...',

    // Rewards
    rewards_title: 'Rewards',
    rewards_sub: 'Spend your coins on something fun 🎁',
    rewards_balance_label: 'Your balance',
    rewards_balance_unit: 'coins',
    rewards_tab_rewards: '🎁 Rewards',
    rewards_tab_history: '📋 History',
    rewards_empty_title: 'No rewards yet',
    rewards_empty_sub: 'Ask a parent to set up rewards in the Parent Zone!',
    rewards_claim: 'Claim',
    rewards_need_more: 'Need more',
    rewards_history_empty_title: 'No claims yet',
    rewards_history_empty_sub: 'Claim a reward to see it here!',
    rewards_approved: 'Approved by parent!',
    rewards_pending: 'Waiting for parent approval',

    // ParentZone
    parent_title: 'Parent Zone',
    parent_sub: 'Manage rewards and approve claims 👨‍👩‍👧',
    parent_balance_label: "Kid's balance",
    parent_tab_rewards: '🎁 Rewards',
    parent_tab_claims: (n) => `📋 Claims${n > 0 ? ` (${n})` : ''}`,
    parent_add_reward: '+ Add Reward',
    parent_no_claims: 'No claims yet',
    parent_approve: 'Approve ✓',
    parent_deny: 'Deny ✗',
    parent_modal_title: 'New Reward',
    parent_modal_presets: 'Quick presets',
    parent_modal_name_label: 'Reward name',
    parent_modal_name_placeholder: 'e.g. Extra playtime...',
    parent_modal_cost_label: 'Cost in coins',
    parent_modal_cta: 'Create Reward →',
    parent_modal_creating: 'Creating...',
    parent_modal_cancel: 'Cancel',
    parent_presets: [
      { label: '30 min TV', cost: 30 },
      { label: 'Ice cream', cost: 50 },
      { label: 'Extra screen time', cost: 60 },
      { label: 'Movie night', cost: 80 },
      { label: 'Toy/gift', cost: 100 },
    ],

    // PinGate
    pin_title: 'Parent Zone',
    pin_sub: 'Enter your PIN to continue 🔒',
    pin_back: '← Back',
    pin_wrong: 'Wrong PIN, try again',
    pin_error: 'Something went wrong',
    pin_enter: 'Enter →',
    pin_checking: 'Checking...',

    // Quiz Results
    quiz_results_perfect: 'Perfect score!',
    quiz_results_perfect_sub: 'If this was a real exam, you just aced it!',
    quiz_results_great: 'Almost perfect!',
    quiz_results_great_sub: "You'd pass this exam easily!",
    quiz_results_good: 'Good effort!',
    quiz_results_good_sub: "You'd pass, but there's room to grow.",
    quiz_results_keep: 'Keep going!',
    quiz_results_keep_sub: 'Re-read the page and try again — you got this!',
    quiz_results_coins: 'Coins earned',
    quiz_results_score: 'Score',
    quiz_results_review: '📖 Worth reviewing:',
    quiz_results_continue: 'Continue →',
    // Quit popup
    quiz_quit_title: 'Leave the quiz? 😢',
    quiz_quit_sub: "Your progress won't be saved.",
    quiz_quit_stay: 'KEEP GOING 💪',
    quiz_quit_leave: 'Yes, leave',

    // StreakPopup
    streak_first_headline: "You're on a streak! ⚡",
    streak_first_sub: 'Come back tomorrow to keep it going!',
    streak_milestone_headline: (n) => `${n} days in a row! 🔥`,
    streak_milestone_sub: "That's incredible — keep it up!",
    streak_default_headline: (n) => `${n} day streak! ⚡`,
    streak_default_sub: "You're building great habits!",
    streak_cta: 'Keep it up! 💪',
  },

  ar: {
    dir: 'rtl',
    // Nav
    nav_chapters: 'الفصول',
    nav_rewards: 'المكافآت',
    nav_parent_zone: 'منطقة الأهل',
    nav_streak_days: (n) => `${n} ${n === 1 ? 'يوم' : 'أيام'}`,
    nav_current_streak: 'السلسلة الحالية ⚡',

    // Chapters
    chapters_add: '+ إضافة فصل',
    chapters_empty_title: 'لا توجد فصول بعد',
    chapters_empty_sub: 'أنشئ فصلك الأول لتبدأ التعلم!',
    chapters_empty_cta: 'إعداد أول فصل',
    chapters_tap: 'اضغط للدراسة ←',
    chapters_modal_title: 'فصل جديد',
    chapters_modal_name_label: 'اسم الفصل',
    chapters_modal_name_placeholder: 'مثلاً: رياضيات، علوم، تاريخ...',
    chapters_modal_icon_label: 'اختر أيقونة',
    chapters_modal_preview: 'معاينة',
    chapters_modal_cta: 'إنشاء الفصل ←',
    chapters_modal_creating: 'جارٍ الإنشاء...',
    chapters_modal_cancel: 'إلغاء',

    // CurrentChapter
    current_back: 'رجوع →',
    current_exams_saved: (n) => `${n} ${n === 1 ? 'اختبار محفوظ' : 'اختبارات محفوظة'}`,
    current_new: 'جديد',
    current_revision: 'مراجعة',
    current_no_exams: 'لا توجد اختبارات بعد',
    current_recent: 'الاختبارات الأخيرة',
    current_more: (n) => `+${n} المزيد في المراجعة`,
    current_questions: (n) => `${n} أسئلة`,

    // Home (Scan)
    home_back: 'رجوع →',
    home_snap: 'صوّر ملاحظاتك أو كتابك المدرسي 📸',
    home_cta: '📸 التقط صورة أو اختر',
    home_generating: 'جارٍ إنشاء الاختبار...',
    home_reading: 'Numio يقرأ الصورة ✨',
    home_error_title: 'حدث خطأ ما',
    home_try_again: 'حاول مجدداً',

    // Revision
    revision_back: 'رجوع →',
    revision_title: 'مراجعة',
    revision_exam: (n) => `${n} ${n === 1 ? 'اختبار' : 'اختبارات'}`,
    revision_original: 'الأصلي',
    revision_version: (n) => `v${n}`,
    revision_no_page_text: 'الأسئلة الجديدة غير متاحة للاختبارات القديمة',

    // QuizIntro
    quiz_intro_lets_start: 'هيا نبدأ!',
    quiz_intro_you_can: 'أنت تستطيع! 💪',
    quiz_intro_questions: (n) => `${n} أسئلة`,
    quiz_intro_start: '← ابدأ',
    quiz_intro_new_questions: '✨ أسئلة جديدة',
    quiz_intro_generating: 'جارٍ إنشاء أسئلة جديدة...',
    quiz_intro_no_page_text: 'هذا الاختبار أُنشئ قبل دعم المراجعة. صوّر صفحة جديدة لاستخدام هذه الميزة.',
    quiz_intro_rate_limit: 'لقد وصلت إلى حد الاختبارات اليومي. عد غداً!',
    quiz_intro_error: 'حدث خطأ ما. حاول مرة أخرى.',

    // Quiz
    quiz_check: 'تحقق',
    quiz_continue: 'استمر ←',
    quiz_saving: 'جارٍ الحفظ...',
    quiz_correct: 'صحيح!',
    quiz_not_quite: 'ليس تماماً!',
    quiz_correct_answer: (a) => `✓ الإجابة الصحيحة: ${a}`,
    quiz_fill_placeholder: 'اكتب إجابتك...',

    // Rewards
    rewards_title: 'المكافآت',
    rewards_sub: 'أنفق عملاتك على شيء ممتع 🎁',
    rewards_balance_label: 'رصيدك',
    rewards_balance_unit: 'عملات',
    rewards_tab_rewards: '🎁 المكافآت',
    rewards_tab_history: '📋 السجل',
    rewards_empty_title: 'لا توجد مكافآت بعد',
    rewards_empty_sub: 'اطلب من أحد والديك إعداد المكافآت في منطقة الأهل!',
    rewards_claim: 'استبدال',
    rewards_need_more: 'تحتاج المزيد',
    rewards_history_empty_title: 'لا توجد طلبات بعد',
    rewards_history_empty_sub: 'استبدل مكافأة لتراها هنا!',
    rewards_approved: 'تمت الموافقة من أحد الوالدين!',
    rewards_pending: 'في انتظار موافقة أحد الوالدين',

    // ParentZone
    parent_title: 'منطقة الأهل',
    parent_sub: 'إدارة المكافآت والموافقة على الطلبات 👨‍👩‍👧',
    parent_balance_label: 'رصيد الطفل',
    parent_tab_rewards: '🎁 المكافآت',
    parent_tab_claims: (n) => `📋 الطلبات${n > 0 ? ` (${n})` : ''}`,
    parent_add_reward: '+ إضافة مكافأة',
    parent_no_claims: 'لا توجد طلبات بعد',
    parent_approve: 'موافقة ✓',
    parent_deny: 'رفض ✗',
    parent_modal_title: 'مكافأة جديدة',
    parent_modal_presets: 'خيارات سريعة',
    parent_modal_name_label: 'اسم المكافأة',
    parent_modal_name_placeholder: 'مثلاً: وقت لعب إضافي...',
    parent_modal_cost_label: 'التكلفة بالعملات',
    parent_modal_cta: 'إنشاء المكافأة ←',
    parent_modal_creating: 'جارٍ الإنشاء...',
    parent_modal_cancel: 'إلغاء',
    parent_presets: [
      { label: '٣٠ دقيقة تلفاز', cost: 30 },
      { label: 'آيس كريم', cost: 50 },
      { label: 'وقت شاشة إضافي', cost: 60 },
      { label: 'سهرة أفلام', cost: 80 },
      { label: 'لعبة / هدية', cost: 100 },
    ],

    // PinGate
    pin_title: 'منطقة الأهل',
    pin_sub: 'أدخل رمز PIN للمتابعة 🔒',
    pin_back: 'رجوع →',
    pin_wrong: 'رمز PIN خاطئ، حاول مجدداً',
    pin_error: 'حدث خطأ ما',
    pin_enter: 'دخول ←',
    pin_checking: 'جارٍ التحقق...',

    // Quiz Results
    quiz_results_perfect: 'نتيجة مثالية!',
    quiz_results_perfect_sub: 'لو كان امتحاناً حقيقياً، لنجحت بامتياز!',
    quiz_results_great: 'شبه مثالي!',
    quiz_results_great_sub: 'ستنجح في هذا الامتحان بسهولة!',
    quiz_results_good: 'جهد رائع!',
    quiz_results_good_sub: 'ستنجح، لكن يمكنك التحسين أكثر.',
    quiz_results_keep: 'واصل المحاولة!',
    quiz_results_keep_sub: 'أعد قراءة الصفحة وحاول مجدداً — أنت تستطيع!',
    quiz_results_coins: 'العملات المكتسبة',
    quiz_results_score: 'النتيجة',
    quiz_results_review: '📖 يستحق المراجعة:',
    quiz_results_continue: 'استمر ←',
    // Quit popup
    quiz_quit_title: 'هل تريد الخروج؟ 😢',
    quiz_quit_sub: 'لن يتم حفظ تقدمك.',
    quiz_quit_stay: 'واصل 💪',
    quiz_quit_leave: 'نعم، اخرج',

    // StreakPopup
    streak_first_headline: 'أنت في سلسلة! ⚡',
    streak_first_sub: 'عد غداً للحفاظ عليها!',
    streak_milestone_headline: (n) => `${n} أيام متتالية! 🔥`,
    streak_milestone_sub: 'رائع جداً — استمر!',
    streak_default_headline: (n) => `سلسلة ${n} أيام! ⚡`,
    streak_default_sub: 'أنت تبني عادات رائعة!',
    streak_cta: 'استمر! 💪',
  },
}

export function t(lang, key, ...args) {
  const dict = translations[lang] || translations.en
  const val = dict[key] ?? translations.en[key]
  if (typeof val === 'function') return val(...args)
  return val ?? key
}
