import { Link } from "react-router-dom";
import { bottomLinks, footerSections, socialLinks } from "../assets/assets";

export default function Footer() {
    return (
        <footer className="w-full bg-surface-container-low border-t border-outline-variant/20 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-4 gap-10">
                {/* Brand */}
                <div className="md:col-span-1">
                    <Link to="/" className="text-primary block mb-2">
                        <img src="/logo.svg" alt="Logo" className="h-10 mt-1.5" />
                    </Link>

                    <p className="text-black/55 text-sm leading-relaxed pr-4">
                        Connecting discerning palates with the world's most exceptional culinary experiences.
                    </p>
                </div>

                {/* Dynamic Sections */}
                {footerSections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-4">
                        <h4 className="text-xs font-medium tracking-widest text-primary uppercase">{section.title}</h4>

                        {section.links.map((link) => (
                            <Link
                                key={link.label}
                                to={link.path}
                                className="text-sm text-black/55 hover:text-secondary transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                ))}

                {/* Contact */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-medium tracking-widest text-primary uppercase">CONTACT</h4>

                    <p className="text-sm text-black/55">support@example.com</p>

                    <div className="flex gap-4 mt-2">
                        {socialLinks.map(({ icon: Icon, href }, index) => (
                            <a key={index} href={href} className="text-black/55 hover:text-secondary transition-colors">
                                <Icon size={18} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-6 md:px-10 mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-black/55">© 2026 QuickDine. All rights reserved.</p>

                <div className="flex gap-6">
                    {bottomLinks.map((link) => (
                        <Link key={link.label} to={link.path} className="text-xs text-black/55 hover:text-secondary">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
