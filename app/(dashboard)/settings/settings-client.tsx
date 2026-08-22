'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Link as LinkIcon, Users, CreditCard, Copy, RefreshCw, Save } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useSearchParams, useRouter } from 'next/navigation'

interface UserItem {
  id: string
  email?: string
  full_name?: string
  role?: string
}

interface ProfileItem {
  id: string
  full_name?: string
  role?: string
}

interface DealershipItem {
  id: string
  name: string
  address_line1?: string
  city?: string
  county?: string
  postcode?: string
  phone?: string
  email?: string
  website_url?: string
  vat_number?: string
  fca_number?: string
  primary_colour?: string
  api_key?: string
  autotrader_advertiser_id?: string
  ebay_store_id?: string
  subscription_status?: string
  subscription_tier?: string
  trial_ends_at?: string
}

interface TeamMember {
  id: string
  full_name: string
  role: string
  created_at: string
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'dealership', label: 'Dealership', icon: Building2 },
  { id: 'integrations', label: 'Integrations', icon: LinkIcon },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function SettingsClient({ 
  user, 
  profile, 
  dealership, 
  team = [] 
}: { 
  user: UserItem
  profile: ProfileItem
  dealership: DealershipItem
  team: TeamMember[] 
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabFromUrl = searchParams.get('tab')
  const activeTab = tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'profile'
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleTabChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`/settings?${params.toString()}`)
  }

  // Profile State
  const [profileName, setProfileName] = useState(profile.full_name || '')

  // Dealership State
  const [dealershipData, setDealershipData] = useState({
    name: dealership.name || '',
    address_line1: dealership.address_line1 || '',
    city: dealership.city || '',
    county: dealership.county || '',
    postcode: dealership.postcode || '',
    phone: dealership.phone || '',
    email: dealership.email || '',
    website_url: dealership.website_url || '',
    vat_number: dealership.vat_number || '',
    fca_number: dealership.fca_number || '',
    primary_colour: dealership.primary_colour || '#0EA5E9'
  })

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profileName })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Profile updated successfully')
      router.refresh()
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  // Integrations State
  const [integrations, setIntegrations] = useState({
    autotrader: !!dealership.autotrader_advertiser_id,
    autotrader_id: dealership.autotrader_advertiser_id || '',
    ebay: !!dealership.ebay_store_id,
    ebay_id: dealership.ebay_store_id || ''
  })

  const handleSaveDealership = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('dealerships')
        .update(dealershipData)
        .eq('id', dealership.id)

      if (error) throw error
      toast.success('Dealership details saved')
    } catch {
      toast.error('Failed to save details')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveIntegrations = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('dealerships')
        .update({
          autotrader_advertiser_id: integrations.autotrader_id || null,
          ebay_store_id: integrations.ebay_id || null
        })
        .eq('id', dealership.id)

      if (error) throw error
      toast.success('Integrations updated')
    } catch {
      toast.error('Failed to update integrations')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyApiKey = () => {
    if (dealership.api_key) {
      navigator.clipboard.writeText(dealership.api_key)
      toast.success('API Key copied to clipboard')
    }
  }

  const handleManageBilling = async () => {
    toast.info('Opening billing portal...')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-void">
      <div className="bg-carbon border-b border-steel px-6 py-8">
        <h1 className="font-syne font-bold text-[28px] text-cream mb-6">Settings</h1>
        
        <div className="flex gap-6 border-b border-steel">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "font-mono text-[12px] uppercase tracking-wider pb-3 flex items-center gap-2 border-b-2 transition-colors",
                  activeTab === tab.id 
                    ? "text-cream border-blue" 
                    : "text-pewter border-transparent hover:text-silver"
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-carbon border border-steel p-6 rounded-[2px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg text-cream">Personal Information</h2>
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  <Save size={14} /> {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
                </Button>
              </div>
              
              <div className="flex items-center gap-6 mb-8 pb-6 border-b border-steel">
                <div className="w-20 h-20 rounded-full bg-asphalt border border-steel flex items-center justify-center text-blue text-2xl font-mono">
                  {profileName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Button variant="outline" size="sm">CHANGE AVATAR</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Full Name</label>
                  <Input 
                    value={profileName} 
                    onChange={(e) => setProfileName(e.target.value)}
                    className="bg-asphalt/50 focus:bg-carbon transition-colors" 
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Email Address</label>
                  <Input value={user.email || ''} readOnly className="bg-asphalt/50 opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Role</label>
                  <div className="h-11 flex items-center">
                    <Badge variant="outline" className="uppercase tracking-wider">{profile.role || 'Admin'}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-carbon border border-steel p-6 rounded-[2px]">
              <h2 className="font-syne font-bold text-lg text-cream mb-6">Change Password</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">New Password</label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Confirm Password</label>
                  <Input type="password" />
                </div>
              </div>
              <Button className="mt-6">UPDATE PASSWORD</Button>
            </div>
          </div>
        )}

        {/* DEALERSHIP TAB */}
        {activeTab === 'dealership' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-carbon border border-steel p-6 rounded-[2px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-syne font-bold text-lg text-cream">Dealership Details</h2>
                <Button onClick={handleSaveDealership} disabled={isSaving}>
                  {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Dealership Name</label>
                  <Input value={dealershipData.name} onChange={(e) => setDealershipData({...dealershipData, name: e.target.value})} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Address Line 1</label>
                  <Input value={dealershipData.address_line1} onChange={(e) => setDealershipData({...dealershipData, address_line1: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">City</label>
                  <Input value={dealershipData.city} onChange={(e) => setDealershipData({...dealershipData, city: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">County</label>
                  <Input value={dealershipData.county} onChange={(e) => setDealershipData({...dealershipData, county: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Postcode</label>
                  <Input value={dealershipData.postcode} onChange={(e) => setDealershipData({...dealershipData, postcode: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Phone</label>
                  <Input value={dealershipData.phone} onChange={(e) => setDealershipData({...dealershipData, phone: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Email</label>
                  <Input value={dealershipData.email} onChange={(e) => setDealershipData({...dealershipData, email: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Website URL</label>
                  <Input value={dealershipData.website_url} onChange={(e) => setDealershipData({...dealershipData, website_url: e.target.value})} />
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="bg-[#13161C] border border-steel p-6 rounded-[2px]">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-syne font-bold text-lg text-cream">Public API Key</h2>
                <Badge variant="outline">Live</Badge>
              </div>
              <p className="font-inter text-sm text-silver mb-6 max-w-2xl">
                Used by your dealer website to fetch live stock data and submit leads securely. 
                Do not expose this on any public clients other than your authorised dealership website.
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-void border border-steel p-3 rounded-[2px] font-mono text-[13px] text-blue break-all">
                  {dealership.api_key || 'No API key generated'}
                </div>
                <Button variant="outline" onClick={handleCopyApiKey} className="shrink-0 gap-2">
                  <Copy size={14} /> COPY
                </Button>
                <Button variant="outline" className="shrink-0 gap-2 border-warning/50 text-warning hover:bg-warning/10">
                  <RefreshCw size={14} /> REGENERATE
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-2">
              <p className="font-inter text-sm text-silver">Connect external advertising portals and service integrations.</p>
              <Button onClick={handleSaveIntegrations} disabled={isSaving}>
                {isSaving ? 'SAVING...' : 'SAVE INTEGRATIONS'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AutoTrader */}
              <div className="bg-carbon border border-steel p-5 rounded-[2px] hover:border-slate transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-syne font-bold text-lg text-cream mb-1">AutoTrader</h3>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Classifieds</p>
                  </div>
                  <Badge variant={integrations.autotrader ? "positive" : "secondary"}>
                    {integrations.autotrader ? "CONNECTED" : "DISCONNECTED"}
                  </Badge>
                </div>
                <div className="space-y-2 mt-6">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Advertiser ID</label>
                  <Input 
                    placeholder="e.g. 12345678" 
                    value={integrations.autotrader_id}
                    onChange={(e) => setIntegrations({...integrations, autotrader_id: e.target.value})}
                  />
                </div>
              </div>

              {/* eBay Motors */}
              <div className="bg-carbon border border-steel p-5 rounded-[2px] hover:border-slate transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-syne font-bold text-lg text-cream mb-1">eBay Motors</h3>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Marketplace</p>
                  </div>
                  <Badge variant={integrations.ebay ? "positive" : "secondary"}>
                    {integrations.ebay ? "CONNECTED" : "DISCONNECTED"}
                  </Badge>
                </div>
                <div className="space-y-2 mt-6">
                  <label className="font-mono text-[11px] text-pewter uppercase tracking-wider">Store ID</label>
                  <Input 
                    placeholder="e.g. store_xyz" 
                    value={integrations.ebay_id}
                    onChange={(e) => setIntegrations({...integrations, ebay_id: e.target.value})}
                  />
                </div>
              </div>

              {/* DVLA */}
              <div className="bg-carbon border border-steel p-5 rounded-[2px]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-syne font-bold text-lg text-cream mb-1">DVLA Lookups</h3>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Data Source</p>
                  </div>
                  <Badge variant="warning">COMMERCIAL AGREEMENT REQUIRED</Badge>
                </div>
                <p className="font-inter text-[13px] text-silver mt-4">
                  Requires commercial data agreement with DVLA.
                </p>
              </div>

              {/* CAP HPI */}
              <div className="bg-carbon border border-steel p-5 rounded-[2px]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-syne font-bold text-lg text-cream mb-1">CAP HPI</h3>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Valuations & Checks</p>
                  </div>
                  <Badge variant="secondary">PLANNED</Badge>
                </div>
                <p className="font-inter text-[13px] text-silver mt-4">
                  Automated valuation and vehicle provenance checks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-syne font-bold text-lg text-cream">Team Members</h2>
              <Button>INVITE MEMBER</Button>
            </div>

            <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-asphalt border-b border-steel">
                    <th className="py-3 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider">Member</th>
                    <th className="py-3 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider">Role</th>
                    <th className="py-3 px-6 font-mono text-[10px] text-pewter uppercase tracking-wider">Joined</th>
                    <th className="py-3 px-6 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id} className="border-b border-steel">
                      <td className="py-4 px-6 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue/10 border border-blue/20 flex items-center justify-center text-blue font-mono text-[12px]">
                          {member.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-inter text-[14px] text-cream font-medium">{member.full_name}</p>
                          {member.id === user.id && <p className="font-mono text-[10px] text-pewter mt-0.5">You</p>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="uppercase">{member.role}</Badge>
                      </td>
                      <td className="py-4 px-6 font-mono text-[12px] text-silver">
                        {format(new Date(member.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {member.id !== user.id && (
                          <button className="font-inter text-[12px] text-negative hover:underline">Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="font-syne font-bold text-lg text-cream mb-6">Subscription & Billing</h2>

            {/* Current Plan */}
            <div className="bg-carbon border border-steel rounded-[2px] p-6 mb-6 relative overflow-hidden">
              {dealership.subscription_status === 'trialing' && (
                <div className="absolute top-0 right-0 bg-warning text-void font-mono font-bold text-[10px] tracking-widest uppercase px-4 py-1">
                  TRIAL ACTIVE
                </div>
              )}
              
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-1">Current Plan</p>
                  <div className="flex items-center gap-3">
                    <h3 className="font-syne font-bold text-[32px] text-cream capitalize">{dealership.subscription_tier || 'Starter'}</h3>
                    <Badge variant={dealership.subscription_status === 'active' ? 'positive' : dealership.subscription_status === 'trialing' ? 'warning' : 'negative'} className="uppercase">
                      {dealership.subscription_status || 'Active'}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" onClick={handleManageBilling}>MANAGE BILLING</Button>
              </div>

              {dealership.subscription_status === 'trialing' && dealership.trial_ends_at && (
                <div className="bg-asphalt border border-steel p-4 rounded-[2px] flex items-center justify-between mt-6">
                  <div>
                    <p className="font-inter text-[14px] text-cream font-medium mb-1">Your free trial is active</p>
                    <p className="font-inter text-[13px] text-silver">Manage your subscription in the billing portal.</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[24px] text-warning font-bold leading-none mb-1">
                      {Math.max(0, differenceInDays(new Date(dealership.trial_ends_at), new Date()))}
                    </p>
                    <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">Days Remaining</p>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="bg-carbon border border-steel rounded-[2px] overflow-hidden">
              <div className="p-6 border-b border-steel">
                <h3 className="font-syne font-bold text-lg text-cream">Billing History</h3>
              </div>
              <div className="p-12 text-center">
                <p className="font-inter text-sm text-pewter">No billing history available yet.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
