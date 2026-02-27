import React, { useState, useEffect } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Clock, ShieldAlert, LogOut, Trophy, Activity, Goal, CheckCircle2 } from 'lucide-react';

// ==========================================
// SUPABASE INITIALIZATION
// ==========================================
// Add your Supabase URL and Key here to connect to your database.
// If running locally in Vite, you can switch back to: import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // login, setup, tagging
  const [analystId, setAnalystId] = useState('');
  
  // Setup State
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [matchDetails, setMatchDetails] = useState('');
  
  // Match State
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [isAttacking3rd, setIsAttacking3rd] = useState(false);
  const [toast, setToast] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    if (currentScreen === 'setup') {
      fetchTournaments();
    }
  }, [currentScreen]);

  // Timer Logic
  useEffect(() => {
    let interval;
    if (currentScreen === 'tagging' && activeMatch) {
      interval = setInterval(() => {
        setMatchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, activeMatch]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchTournaments = async () => {
    const { data: tourns, error: tournsError } = await supabase.from('tournaments').select('*');
    const { data: tms, error: tmsError } = await supabase.from('teams').select('*');
    
    if (tourns && !tournsError) setTournaments(tourns);
    if (tms && !tmsError) setTeams(tms);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const id = e.target.analystId.value;
    const pwd = e.target.password.value;

    const { data, error } = await supabase
      .from('analysts')
      .select('*')
      .eq('analyst_id', id)
      .eq('password', pwd)
      .single();

    if (data && !error) {
      setAnalystId(id);
      setCurrentScreen('setup');
    } else {
      alert('Invalid Credentials');
    }
  };

  const startMatch = async () => {
    if (!selectedTournament || !selectedTeamA || !selectedTeamB) return;
    
    const newMatch = {
      tournament_id: selectedTournament,
      team_a_id: selectedTeamA,
      team_b_id: selectedTeamB,
      details: matchDetails,
      start_time: new Date().toISOString(),
      status: 'Live'
    };

    const { data, error } = await supabase
      .from('matches')
      .insert([newMatch])
      .select()
      .single();

    if (data && !error) {
      setActiveMatch(data);
      setCurrentScreen('tagging');
      setMatchSeconds(0);
    } else {
      alert('Failed to start match. Please check your database connection.');
      console.error(error);
    }
  };

  const endMatch = async () => {
    if (activeMatch) {
      await supabase
        .from('matches')
        .update({ status: 'Finished' })
        .eq('id', activeMatch.id);
    }
      
    setActiveMatch(null);
    setCurrentScreen('setup');
  };

  const logEvent = async (teamId, eventType) => {
    const matchMinute = Math.floor(matchSeconds / 60);
    const teamName = teams.find(t => t.id === teamId)?.name || 'Team';
    
    const eventPayload = {
      match_id: activeMatch.id,
      team_id: teamId,
      event_type: eventType,
      is_attacking_3rd: isAttacking3rd,
      match_minute: matchMinute
    };

    const { error } = await supabase.from('events').insert([eventPayload]);
    
    if (!error) {
      setToast(`Logged: ${teamName} - ${eventType}`);
    } else {
      console.error("Failed to log event:", error);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unknown Team';

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderButton = (teamId, label, type) => {
    // Dynamic styling based on group and Attacking 3rd state
    let baseStyle = "w-full py-4 rounded-xl font-bold text-sm md:text-base uppercase tracking-wide transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 leading-tight px-4 text-center";
    
    if (type === 'pass') {
      if (isAttacking3rd) {
        baseStyle += " bg-yellow-400 text-gray-900 border-2 border-yellow-500 shadow-yellow-500/50"; // Gold theme
      } else {
        baseStyle += " bg-slate-700 text-white hover:bg-slate-600";
      }
    } else if (type === 'shot') {
      if (label === 'GOAL') baseStyle += " bg-emerald-500 text-black border-2 border-emerald-600";
      else baseStyle += " bg-orange-600 text-white hover:bg-orange-500";
    } else if (type === 'action') {
      if (label === 'Yellow Card') baseStyle += " bg-yellow-400 text-black";
      else if (label === 'Red Card') baseStyle += " bg-red-600 text-white";
      else if (label === 'Foul' || label === 'Tackle') baseStyle += " bg-rose-800 text-white hover:bg-rose-700";
    }

    return (
      <button 
        key={label}
        onClick={() => logEvent(teamId, label)}
        className={baseStyle}
      >
        {label}
      </button>
    );
  };

  const renderTeamBoard = (teamId) => (
    <div className="flex-1 flex flex-col bg-gray-900 p-3 md:p-6 gap-4 overflow-y-auto">
      <div className="text-center font-black text-xl md:text-2xl text-white tracking-widest uppercase border-b border-gray-700 pb-3 flex items-center justify-center gap-2 shrink-0">
        <ShieldAlert className="w-6 h-6 text-gray-400" />
        {getTeamName(teamId)}
      </div>

      {/* Passes Group */}
      <div className={`p-3 md:p-4 rounded-xl transition-colors duration-300 shrink-0 ${isAttacking3rd ? 'bg-yellow-400/10 border border-yellow-500/30' : 'bg-gray-800'}`}>
        <div className="text-sm text-gray-400 uppercase font-bold mb-3 tracking-wider flex justify-between">
          <span>Passing</span>
          {isAttacking3rd && <span className="text-yellow-400">Attacking 3rd Active</span>}
        </div>
        <div className="flex flex-col gap-3">
          {['Successful Pass', 'Missed Pass', 'Intercepted Pass'].map(lbl => renderButton(teamId, lbl, 'pass'))}
        </div>
      </div>

      {/* Shots Group */}
      <div className="bg-gray-800 p-3 md:p-4 rounded-xl shrink-0">
        <div className="text-sm text-gray-400 uppercase font-bold mb-3 tracking-wider">Shots / Attempts</div>
        <div className="flex flex-col gap-3">
          {['Shot', 'SoT', 'GOAL'].map(lbl => renderButton(teamId, lbl, 'shot'))}
        </div>
      </div>

      {/* Actions Group */}
      <div className="bg-gray-800 p-3 md:p-4 rounded-xl mb-6 shrink-0">
        <div className="text-sm text-gray-400 uppercase font-bold mb-3 tracking-wider">Actions / Disciplinary</div>
        <div className="flex flex-col gap-3">
          {['Yellow Card', 'Red Card', 'Tackle', 'Foul'].map(lbl => renderButton(teamId, lbl, 'action'))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // SCREENS
  // ==========================================

  if (currentScreen === 'login') {
    return (
      <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-center mb-8 gap-3">
            <Activity className="text-blue-500 w-10 h-10" />
            <h1 className="text-3xl font-black text-white tracking-tight">CAC <span className="text-blue-500">QUICK-TAGGER</span></h1>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Analyst ID</label>
              <input name="analystId" type="text" required className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none" placeholder="" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 block">Password</label>
              <input name="password" type="password" required className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-4 rounded-xl mt-4 transition-colors">
              Login to System
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentScreen === 'setup') {
    const availableTeamsForB = teams.filter(t => t.tournament_id === selectedTournament && t.id !== selectedTeamA);
    const isReady = selectedTournament && selectedTeamA && selectedTeamB;

    return (
      <div className="min-h-[100dvh] bg-gray-950 flex flex-col p-4 md:p-8">
        <div className="max-w-4xl w-full mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="text-blue-500" /> Match Setup
            </h1>
            <div className="text-gray-400 text-sm flex items-center gap-2">
              Analyst: <span className="text-white font-bold">{analystId}</span>
              <button onClick={() => setCurrentScreen('login')} className="ml-4 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Select Tournament</label>
                <select 
                  className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-700 focus:border-blue-500 focus:outline-none appearance-none"
                  value={selectedTournament}
                  onChange={(e) => { setSelectedTournament(e.target.value); setSelectedTeamA(''); setSelectedTeamB(''); }}
                >
                  <option value="">-- Choose Tournament --</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {selectedTournament && (
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-4">
                  <div>
                    <label className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-2 block">Team A (Home/Left)</label>
                    <select 
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-blue-500 outline-none"
                      value={selectedTeamA}
                      onChange={(e) => setSelectedTeamA(e.target.value)}
                    >
                      <option value="">-- Select Team A --</option>
                      {teams.filter(t => t.tournament_id === selectedTournament).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-red-400 uppercase font-bold tracking-wider mb-2 block">Team B (Away/Right)</label>
                    <select 
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-red-500 outline-none"
                      value={selectedTeamB}
                      onChange={(e) => setSelectedTeamB(e.target.value)}
                      disabled={!selectedTeamA}
                    >
                      <option value="">-- Select Team B --</option>
                      {availableTeamsForB.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 flex flex-col justify-between">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Free Text Details (Optional)</label>
                <textarea 
                  rows={4}
                  className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="e.g. Group stage match, raining conditions..."
                  value={matchDetails}
                  onChange={(e) => setMatchDetails(e.target.value)}
                />
              </div>

               <button 
                onClick={startMatch}
                disabled={!isReady}
                className={`w-full p-5 rounded-2xl font-black text-lg tracking-wide flex items-center justify-center gap-3 transition-all ${
                  isReady 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] shadow-xl shadow-blue-500/20' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Goal /> START MATCH
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAGGING INTERFACE (Split Screen)
  // ==========================================
  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-black text-white overflow-hidden font-sans select-none">
      
      {/* Toast Notification (Feedback) */}
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black px-6 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {toast}
        </div>
      )}

      {/* Header Panel */}
      <div className="h-16 bg-gray-950 flex items-center justify-between px-2 md:px-6 border-b border-gray-800 shadow-xl z-10 shrink-0">
        
        {/* Left: Clock */}
        <div className="flex items-center gap-2 bg-gray-900 px-3 md:px-4 py-2 rounded-lg border border-gray-800 md:w-32 justify-center">
          <Clock className="w-4 h-4 text-blue-500 hidden sm:block" />
          <span className="font-mono text-lg md:text-xl font-black tracking-wider text-blue-100">{formatTime(matchSeconds)}</span>
        </div>

        {/* Center: Attacking 3rd Toggle */}
        <button 
          onClick={() => setIsAttacking3rd(!isAttacking3rd)}
          className={`flex items-center gap-2 px-3 md:px-6 py-2 rounded-full font-bold uppercase text-[10px] md:text-sm tracking-wider transition-all border-2 flex-1 max-w-[280px] mx-2 justify-center ${
            isAttacking3rd 
              ? 'bg-yellow-400 text-gray-900 border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
          }`}
        >
          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isAttacking3rd ? 'bg-black animate-pulse' : 'bg-gray-600'}`}></div>
          <span className="hidden sm:inline">Attacking 3rd</span>
          <span className="inline sm:hidden">ATT 3rd</span>
        </button>

        {/* Right: End Match */}
        <button 
          onClick={() => {
            if(window.confirm('Are you sure you want to end this match?')) endMatch();
          }}
          className="bg-red-950/50 hover:bg-red-900 text-red-400 px-3 md:px-4 py-2 rounded-lg font-bold uppercase text-[10px] md:text-xs tracking-wider border border-red-900 transition-colors shrink-0"
        >
          End
        </button>
      </div>

      {/* SPLIT SCREEN LOGIC */}
      <div className="flex-1 flex flex-col landscape:flex-row overflow-hidden relative">
        {/* Divider line for landscape */}
        <div className="hidden landscape:block absolute left-1/2 top-0 bottom-0 w-1 bg-gray-800 -translate-x-1/2 z-10"></div>
        
        {/* Team A Panel */}
        {renderTeamBoard(activeMatch?.team_a_id)}

        {/* Divider line for portrait */}
        <div className="block landscape:hidden h-1 w-full bg-gray-800 shrink-0"></div>

        {/* Team B Panel */}
        {renderTeamBoard(activeMatch?.team_b_id)}
      </div>
    </div>
  );
}
