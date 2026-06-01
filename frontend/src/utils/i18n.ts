import { usePreferenceStore } from '../store/preferenceStore';

export const TRANSLATIONS = {
  en: {
    // Nav / General
    home: 'Home',
    schedules: 'Schedules',
    alerts: 'Arrival Alerts',
    settings: 'Settings',
    profile: 'Profile',
    feedback: 'Feedback',
    routes: 'Routes',
    cancel: 'Cancel',
    save: 'Save',
    active: 'Active',
    confirm: 'Confirm',

    // Home / Live Tracker
    where_to: 'Where to?',
    where_are_you_going: 'Where are you going today?',
    plan_transit: 'Plan Transit Journey',
    from_placeholder: 'From: Current Location (Tap to select)',
    to_placeholder: 'To: Where is your destination?',
    suggested_routes: 'Suggested Routes',
    recent_searches: 'Recent Searches',
    favorite_routes: 'FAVORITE ROUTES',
    gps_location: 'GPS Location',
    location_required: 'Location Required',
    enable_gps: 'Make sure Location Service is enabled on your device.',
    nearby_stops: 'Nearby Stops',
    bus_assigned: 'Bus Assigned',
    bus_approaching: 'Bus Approaching!',
    follow_bus: 'Follow Bus',
    following: 'Following',
    cancel_trip: 'Cancel Trip',
    countdown: 'countdown',
    min: 'min',
    arrived: 'Arrived',

    // Settings
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language / ቋንቋ',
    default_lang: 'Default app language',
    notifications: 'Notifications',
    bus_alerts: 'Bus Alerts',
    bus_alerts_desc: 'Alerts when buses approach your station',
    eta_alerts: 'ETA Alerts',
    eta_alerts_desc: 'Receive arrival estimation notifications',
    app_updates: 'App Updates',
    app_updates_desc: 'Announcements and route modifications',
    info_version: 'Addis Ababa Bus Tracker v1.2.0. Built with care for commuters in Addis Ababa, Ethiopia.',

    // Schedules
    search_schedules: 'Search Routes & Stations',
    next_departures: 'Next Departures',
    departing_in: 'Departing in',
    terminal: 'Terminal',
    frequency: 'Frequency',
    min_freq: 'mins frequency',
    working_hours: 'Working Hours',
    select_station: 'Select Route / Station to view schedules',
    no_schedules: 'No schedule timings found.',

    // Notifications
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
    all_alerts_read: 'All alerts read',
    new_alerts: 'new alerts waiting',
    mark_all_read: 'Mark all read',
    all_caught_up: 'All Caught Up!',
    no_notif_desc: "You don't have any notifications at the moment. We'll alert you here when a bus approaches your stop or if schedules change.",

    // Auth
    welcome_back: 'Welcome Back',
    signin_desc: 'Sign in to track your bus in real-time',
    create_account: 'Create Account',
    join_desc: 'Join Addis Bus to start tracking in real-time',
    full_name: 'Full Name',
    email_address: 'Email Address',
    phone_number: 'Phone Number (Optional)',
    password: 'Password',
    confirm_password: 'Confirm Password',
    signin_btn: 'Sign In',
    signup_btn: 'Sign Up',
    create_acc_btn: 'Create Account',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    
    // Premium passenger features
    fare: 'Fare',
    seats_available: 'Seats Available',
    moderate_crowd: 'Moderate Crowd',
    heavy_crowd: 'Heavy Crowd',
    share_trip: 'Share Live Trip',
    wake_me_up: 'Wake Me Up',
    alarm_active: 'Proximity Alarm Active ⏰',
    alarm_ringing: 'Arriving at Destination Stop! 🔔',
    alarm_desc: 'You are approaching your final stop. Please prepare to exit the bus!',
    trip_copied: 'Live trip status copied to clipboard! 🔗',
    exit_alarm: 'Get Off Alarm',
  },
  am: {
    // Nav / General
    home: 'መነሻ',
    schedules: 'የጊዜ ሰሌዳ',
    alerts: 'መምጫ ማንቂያዎች',
    settings: 'ቅንብሮች',
    profile: 'ፕሮፋይል',
    feedback: 'ግብረመልስ',
    routes: 'መስመሮች',
    cancel: 'ሰርዝ',
    save: 'አስቀምጥ',
    active: 'አክቲቭ',
    confirm: 'አረጋግጥ',

    // Home / Live Tracker
    where_to: 'ወዴት መሄድ ይፈልጋሉ?',
    where_are_you_going: 'ዛሬ ወዴት መሄድ ይፈልጋሉ?',
    plan_transit: 'ጉዞዎን ያቅዱ',
    from_placeholder: 'ከ: የአሁኑ መገኛ (ለመምረጥ ይንኩ)',
    to_placeholder: 'እስከ: መድረሻዎ የት ነው?',
    suggested_routes: 'የተመከሩ መስመሮች',
    recent_searches: 'የቅርብ ጊዜ ፍለጋዎች',
    favorite_routes: 'ተወዳጅ መስመሮች',
    gps_location: 'ጂፒኤስ መገኛ',
    location_required: 'መገኛ ያስፈልጋል',
    enable_gps: 'እባክዎ በስልክዎ ላይ ጂፒኤስ ማብራትዎን ያረጋግጡ።',
    nearby_stops: 'በአቅራቢያ ያሉ ማቆሚያዎች',
    bus_assigned: 'አውቶቡስ ተመድቧል',
    bus_approaching: 'አውቶቡስ እየደረሰ ነው!',
    follow_bus: 'አውቶቡሱን ተከተል',
    following: 'በመከተል ላይ',
    cancel_trip: 'ጉዞ ሰርዝ',
    countdown: 'ቀሪ ጊዜ',
    min: 'ደቂቃ',
    arrived: 'ደረሰ',

    // Settings
    appearance: 'ገጽታ',
    light: 'ብርሃን',
    dark: 'ጨለማ',
    system: 'የስልክ ሁኔታ',
    language: 'ቋንቋ / Language',
    default_lang: 'ነባሪ መተግበሪያ ቋንቋ',
    notifications: 'ማንቂያዎች',
    bus_alerts: 'የአውቶቡስ ማንቂያዎች',
    bus_alerts_desc: 'አውቶቡስ ማቆሚያዎ ሲቃረብ ማንቂያ ይላኩ',
    eta_alerts: 'የሰዓት ማንቂያዎች',
    eta_alerts_desc: 'አውቶቡሱ የሚደርስበትን ግምት ሰዓት ማንቂያዎችን ይቀበሉ',
    app_updates: 'የመተግበሪያ ማሻሻያዎች',
    app_updates_desc: 'የአዳዲስ መስመሮች መግለጫ እና ማስታወቂያዎች',
    info_version: 'የአዲስ አበባ አውቶቡስ መከታተያ v1.2.0. በአዲስ አበባ፣ ኢትዮጵያ ለሚገኙ ተጓዦች በጥንቃቄ የተሰራ።',

    // Schedules
    search_schedules: 'መስመሮች እና ማቆሚያዎችን ፈልግ',
    next_departures: 'ቀጣይ መነሻዎች',
    departing_in: 'የመነሻ ቀሪ ጊዜ',
    terminal: 'መድረሻ ጣቢያ',
    frequency: 'የመነሻ ልዩነት',
    min_freq: 'ደቂቃ ልዩነት',
    working_hours: 'የስራ ሰዓታት',
    select_station: 'የጊዜ ሰሌዳ ለማየት እባክዎ መስመር ወይም ማቆሚያ ይምረጡ',
    no_schedules: 'ምንም የጊዜ ሰሌዳዎች አልተገኙም።',

    // Notifications
    today: 'ዛሬ',
    yesterday: 'ትላንት',
    earlier: 'ከዚያ በፊት',
    all_alerts_read: 'ሁሉም ማንቂያዎች ተነበዋል',
    new_alerts: 'አዲስ ማንቂያዎች አሉዎት',
    mark_all_read: 'ሁሉንም የተነበቡ አድርግ',
    all_caught_up: 'ሁሉም ተነበዋል!',
    no_notif_desc: 'በአሁኑ ጊዜ ምንም ማንቂያዎች የሉዎትም። አውቶቡስ ሲደርስ ወይም የጊዜ ሰሌዳ ሲቀየር እዚህ እናሳውቅዎታለን።',

    // Auth
    welcome_back: 'እንኳን ደህና መጡ',
    signin_desc: 'የአውቶቡስዎን ቀጥታ እንቅስቃሴ ለመከታተል ይግቡ',
    create_account: 'መለያ ይፍጠሩ',
    join_desc: 'የቀጥታ እንቅስቃሴ ለመከታተል አዲስ አበባ አውቶቡስን ይቀላቀሉ',
    full_name: 'ሙሉ ስም',
    email_address: 'ኢሜይል አድራሻ',
    phone_number: 'ስልክ ቁጥር (ከተፈለገ)',
    password: 'የይለፍ ቃል',
    confirm_password: 'የይለፍ ቃል አረጋግጥ',
    signin_btn: 'ግባ',
    signup_btn: 'ተመዝገብ',
    create_acc_btn: 'መለያ ፍጠር',
    no_account: 'መለያ የለዎትም?',
    have_account: 'ከዚህ በፊት መለያ ፈጥረዋል?',
    
    // Premium passenger features
    fare: 'ታሪፍ',
    seats_available: 'ክፍት ወንበር አለ',
    moderate_crowd: 'መካከለኛ ሰው',
    heavy_crowd: 'በጣም ተጨናንቋል',
    share_trip: 'ቀጥታ ሁኔታ አጋራ',
    wake_me_up: 'ደውልልኝ',
    alarm_active: 'የመውረጃ ማንቂያ በርቷል ⏰',
    alarm_ringing: 'መድረሻ ጣቢያ ደርሰዋል! 🔔',
    alarm_desc: 'ወደ መድረሻ ማቆሚያዎ እየቀረቡ ነው። እባክዎ ከአውቶቡሱ ለመውረድ ይዘጋጁ!',
    trip_copied: 'የጉዞው ቀጥታ መረጃ ኮፒ ተደርጓል! 🔗',
    exit_alarm: 'የመውረጃ ማንቂያ',
  },
};

export const useTranslation = () => {
  const language = usePreferenceStore((state) => state.language);
  const t = (key: keyof typeof TRANSLATIONS.en) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || String(key);
  };
  return { t, locale: language };
};

export default useTranslation;
