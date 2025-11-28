import { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Camera, 
  Mail, 
  Key, 
  SmartphoneNfc, 
  ChevronRight, 
  Flower2, 
  Menu,
  Smartphone
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';

type Tab = 'profile' | 'notifications' | 'security';

const TeacherProfilePage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile menu if needed

  // State for form fields (example)
  const [firstName, setFirstName] = useState('Elena');
  const [lastName, setLastName] = useState('Fisher');
  const [email, setEmail] = useState('elena@zenstudio.no');
  const [bio, setBio] = useState('Sertifisert Vinyasa og Yin Yoga instruktør med over 10 års erfaring. Jeg fokuserer på pust, bevegelse og mindfulness i hver time.');

  // State for notification toggles
  const [notifications, setNotifications] = useState({
    newSignups: true,
    cancellations: true,
    marketing: false,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-[#FDFBF7] h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] sticky top-0 bg-[#FDFBF7]/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
             <Flower2 className="h-5 w-5 text-[#354F41]" />
             <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-[#78716C]" />
          </SidebarTrigger>
        </div>

        <div className="mx-auto max-w-4xl p-6 lg:p-12 pb-24 w-full">
            
            {/* Header Section */}
            <header className="mb-8">
                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-[#292524] mb-2">
                    Innstillinger
                </h1>
                <p className="text-sm text-[#78716C]">Administrer din profil, varslinger og konto.</p>
            </header>

            {/* Tabs Navigation */}
            <div className="mb-8 flex w-full md:w-auto overflow-x-auto no-scrollbar">
                <div className="flex space-x-1 rounded-xl bg-[#F0EFED] p-1 shadow-inner shadow-[#E7E5E4]">
                    <button 
                        onClick={() => switchTab('profile')} 
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            activeTab === 'profile' 
                            ? 'bg-white text-[#292524] shadow-sm' 
                            : 'text-[#78716C] hover:bg-white/50 hover:text-[#57534E]'
                        }`}
                    >
                        <User className="h-4 w-4" />
                        Profil
                    </button>
                    <button 
                        onClick={() => switchTab('notifications')} 
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            activeTab === 'notifications' 
                            ? 'bg-white text-[#292524] shadow-sm' 
                            : 'text-[#78716C] hover:bg-white/50 hover:text-[#57534E]'
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        Varslinger
                    </button>
                    <button 
                        onClick={() => switchTab('security')} 
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            activeTab === 'security' 
                            ? 'bg-white text-[#292524] shadow-sm' 
                            : 'text-[#78716C] hover:bg-white/50 hover:text-[#57534E]'
                        }`}
                    >
                        <Shield className="h-4 w-4" />
                        Sikkerhet
                    </button>
                </div>
            </div>

            {/* Tab Content: Profile */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* Avatar Section */}
                    <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative group">
                                <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-[#F7F5F2] shadow-md" />
                                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#292524] text-white shadow-lg ring-2 ring-white hover:bg-[#44403C] hover:scale-110 transition-all">
                                    <Camera className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-geist text-lg font-medium text-[#292524]">Profilbilde</h3>
                                <p className="text-sm text-[#78716C] mt-1 mb-4">Dette bildet vil være synlig for studentene dine i timeplanen.</p>
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <button className="rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#292524] shadow-sm hover:bg-[#F7F5F2] transition-colors">Slett bilde</button>
                                    <button className="rounded-full bg-[#F7F5F2] px-4 py-2 text-xs font-medium text-[#292524] hover:bg-[#E7E5E4] transition-colors">Last opp nytt</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Form */}
                    <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-semibold text-[#292524]">Personlig Informasjon</h3>
                            {/* <button className="text-sm font-medium text-[#4A6959] hover:text-[#354F41]">Lagre endringer</button> */}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">Fornavn</label>
                                <input 
                                    type="text" 
                                    value={firstName} 
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#292524] placeholder-[#A8A29E] focus:border-[#354F41] focus:outline-none focus:ring-1 focus:ring-[#354F41] transition-all" 
                                />
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">Etternavn</label>
                                <input 
                                    type="text" 
                                    value={lastName} 
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#292524] placeholder-[#A8A29E] focus:border-[#354F41] focus:outline-none focus:ring-1 focus:ring-[#354F41] transition-all" 
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">E-postadresse</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#A8A29E]" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFBF7] pl-10 pr-4 py-2.5 text-sm text-[#292524] placeholder-[#A8A29E] focus:border-[#354F41] focus:outline-none focus:ring-1 focus:ring-[#354F41] transition-all" 
                                    />
                                </div>
                                <p className="text-xs text-[#A8A29E] mt-1">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                            </div>

                            {/* Bio */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">Om deg (Bio)</label>
                                <textarea 
                                    rows={4} 
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#292524] placeholder-[#A8A29E] focus:border-[#354F41] focus:outline-none focus:ring-1 focus:ring-[#354F41] transition-all"
                                />
                                <div className="flex justify-between text-xs text-[#A8A29E]">
                                    <span>Vises på din offentlige instruktørprofil.</span>
                                    <span>{bio.length}/500</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Notifications */}
            {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 md:p-8 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-geist text-base font-semibold text-[#292524]">Varslingsinnstillinger</h3>
                            <p className="text-sm text-[#78716C] mt-1">Velg hvordan og når du vil bli kontaktet.</p>
                        </div>

                        <div className="divide-y divide-[#F5F5F4]">
                            
                            {/* Item 1 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[#292524]">Nye påmeldinger</span>
                                    <span className="text-xs text-[#78716C]">Få e-post når en student melder seg på din time.</span>
                                </div>
                                <button 
                                    onClick={() => handleToggle('newSignups')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#354F41] focus-visible:ring-offset-2 ${notifications.newSignups ? 'bg-[#354F41]' : 'bg-[#E7E5E4]'}`}
                                >
                                    <span className="sr-only">Nye påmeldinger</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.newSignups ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            {/* Item 2 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[#292524]">Avbestillinger</span>
                                    <span className="text-xs text-[#78716C]">Send e-post umiddelbart ved avbestilling (mindre enn 24t).</span>
                                </div>
                                <button 
                                    onClick={() => handleToggle('cancellations')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#354F41] focus-visible:ring-offset-2 ${notifications.cancellations ? 'bg-[#354F41]' : 'bg-[#E7E5E4]'}`}
                                >
                                    <span className="sr-only">Avbestillinger</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.cancellations ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            {/* Item 3 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[#292524]">Markedsføring</span>
                                    <span className="text-xs text-[#78716C]">Nyheter, tips og oppdateringer fra ZenStudio på e-post.</span>
                                </div>
                                <button 
                                    onClick={() => handleToggle('marketing')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#354F41] focus-visible:ring-offset-2 ${notifications.marketing ? 'bg-[#354F41]' : 'bg-[#E7E5E4]'}`}
                                >
                                    <span className="sr-only">Markedsføring</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.marketing ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Security */}
            {activeTab === 'security' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-semibold text-[#292524]">Passord &amp; Sikkerhet</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <button className="flex w-full items-center justify-between rounded-xl bg-[#FDFBF7] p-4 text-left transition-colors hover:bg-[#F7F5F2]">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E7E5E4]">
                                        <Key className="h-5 w-5 text-[#57534E]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#292524]">Endre passord</p>
                                        <p className="text-xs text-[#78716C]">Sist endret for 3 måneder siden</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#A8A29E]" />
                            </button>

                            <button className="flex w-full items-center justify-between rounded-xl bg-[#FDFBF7] p-4 text-left transition-colors hover:bg-[#F7F5F2]">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E7E5E4]">
                                        <SmartphoneNfc className="h-5 w-5 text-[#57534E]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#292524]">To-faktor autentisering</p>
                                        <p className="text-xs text-[#78716C]">Anbefalt for økt sikkerhet</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-[#E7E5E4] px-2 py-1 text-[10px] font-semibold text-[#57534E]">Deaktivert</span>
                            </button>
                        </div>
                     </div>

                     {/* Logout Danger Zone */}
                     <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-rose-700">Logg ut av alle enheter</h3>
                                <p className="text-xs text-rose-600/80 mt-1">Dette vil logge deg ut fra mobil, tablet og desktop.</p>
                            </div>
                            <button className="rounded-lg bg-white border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50 transition-colors">
                                Logg ut
                            </button>
                        </div>
                     </div>
                </div>
            )}

            {/* Global Footer Save (Sticky on Mobile, Static on Desktop) */}
            <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-[#E7E5E4] md:border-none p-4 md:p-0 flex justify-end gap-3 z-30">
                <button className="rounded-full px-6 py-2.5 text-sm font-medium text-[#78716C] hover:text-[#292524] transition-colors hidden md:block">Avbryt</button>
                <button className="flex-1 md:flex-none justify-center rounded-full bg-[#292524] px-6 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#292524] hover:scale-[1.02] active:scale-[0.98] ios-ease">
                    Lagre endringer
                </button>
            </div>

        </div>
      </main>
    </SidebarProvider>
  );
};

export default TeacherProfilePage;

