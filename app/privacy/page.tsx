"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    // Use a static date to avoid hydration mismatch
    const lastUpdated = "February 13, 2026";
    
    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link 
                        href="/"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to App
                    </Link>
                    
                    <h1 className="text-4xl font-black tracking-tight mb-2">Privacy Policy</h1>
                    <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
                </div>

                {/* Content */}
                <div className="prose prose-invert max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Marco Polo is a privacy-first connection app designed for intimate, meaningful connections. 
                            We collect minimal data and use end-to-end encryption to protect your privacy.
                        </p>
                    </section>

                    {/* Data We Collect */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Data We Collect</h2>
                        <div className="space-y-4 text-muted-foreground">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Phone Numbers</h3>
                                <p className="leading-relaxed">
                                    We store your phone number in hashed form (SHA-256) for user identification and connection matching. 
                                    Your actual phone number is never shared with other users.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Custom Messages</h3>
                                <p className="leading-relaxed">
                                    Your custom "Marco" and "Polo" messages are encrypted using AES-256-GCM before storage. 
                                    Only you can decrypt them.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Recovery Email (Optional)</h3>
                                <p className="leading-relaxed">
                                    If you choose to add a recovery email, it is stored securely and only used for account recovery.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Connection Data</h3>
                                <p className="leading-relaxed">
                                    We store your connections (up to 3) and their current status (waiting, responded, etc.).
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* How We Use Data */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. How We Use Your Data</h2>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                            <li>Enable real-time connections between you and your chosen contacts</li>
                            <li>Send notifications when someone signals you</li>
                            <li>Facilitate friend requests and invitations</li>
                            <li>Improve the service and fix bugs</li>
                        </ul>
                        <p className="text-muted-foreground mt-4 leading-relaxed">
                            <strong className="text-foreground">We never:</strong> Sell your data, share it with third parties, 
                            use it for advertising, or analyze it for marketing purposes.
                        </p>
                    </section>

                    {/* Your Rights (GDPR) */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Your Rights (GDPR)</h2>
                        <div className="space-y-4 text-muted-foreground">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Right to Access</h3>
                                <p className="leading-relaxed">
                                    You can export all your data at any time from the Settings menu. 
                                    This includes your profile, connections, and invitation history.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Right to Deletion</h3>
                                <p className="leading-relaxed">
                                    You can delete your account and all associated data at any time from the Settings menu. 
                                    This action is immediate and irreversible.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Right to Withdraw Consent</h3>
                                <p className="leading-relaxed">
                                    You can revoke invitations and remove connections at any time.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Data Retention */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Data Retention</h2>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                            <li><strong className="text-foreground">Active accounts:</strong> Data is retained indefinitely while your account is active</li>
                            <li><strong className="text-foreground">Deleted accounts:</strong> All data is immediately and permanently deleted</li>
                            <li><strong className="text-foreground">Expired invitations:</strong> Automatically deleted after 7 days</li>
                            <li><strong className="text-foreground">Inactive accounts:</strong> We do not delete inactive accounts automatically</li>
                        </ul>
                    </section>

                    {/* Security */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Security</h2>
                        <div className="space-y-3 text-muted-foreground">
                            <p className="leading-relaxed">
                                <strong className="text-foreground">End-to-End Encryption:</strong> Custom messages are encrypted 
                                using AES-256-GCM with keys stored only on your device.
                            </p>
                            <p className="leading-relaxed">
                                <strong className="text-foreground">Phone Number Hashing:</strong> Phone numbers are hashed using 
                                SHA-256 with a salt before storage.
                            </p>
                            <p className="leading-relaxed">
                                <strong className="text-foreground">Secure Tokens:</strong> Invitation tokens are generated using 
                                cryptographically secure random number generation (256-bit).
                            </p>
                            <p className="leading-relaxed">
                                <strong className="text-foreground">Firebase Security:</strong> All data is stored in Firebase with 
                                strict security rules ensuring users can only access their own data.
                            </p>
                        </div>
                    </section>

                    {/* Data Sharing */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Data Sharing</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We do not share your data with third parties except:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
                            <li><strong className="text-foreground">Firebase (Google):</strong> Our infrastructure provider, 
                            subject to their privacy policy</li>
                            <li><strong className="text-foreground">Legal requirements:</strong> If required by law or to 
                            protect our rights</li>
                        </ul>
                    </section>

                    {/* Children's Privacy */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Children's Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Marco Polo is not intended for users under 13 years of age. We do not knowingly collect 
                            data from children under 13.
                        </p>
                    </section>

                    {/* Changes to Policy */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this privacy policy from time to time. We will notify you of any changes by 
                            updating the "Last updated" date at the top of this policy.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about this privacy policy or your data, please contact us at:
                        </p>
                        <p className="text-foreground mt-3">
                            <strong>Email:</strong> privacy@marcopolo.app
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border">
                    <Link 
                        href="/"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to App
                    </Link>
                </div>
            </div>
        </div>
    );
}
