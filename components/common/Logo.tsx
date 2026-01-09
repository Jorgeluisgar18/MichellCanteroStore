import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
    showStore?: boolean;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ showStore = true, className = "" }) => {
    return (
        <Link
            href="/"
            className={`flex items-center gap-2 group transition-opacity hover:opacity-90 ${className}`}
        >
            <div className="relative w-48 h-12 md:w-64 md:h-16">
                <Image
                    src="https://instagram.fbaq2-2.fna.fbcdn.net/v/t51.29350-15/348472091_733290785209234_3236028598128218197_n.jpg?stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQuaW1hZ2VfdXJsZ2VuLjE0NDB4MTQ0MC5zZHIuZjI5MzUwLmRlZmF1bHRfaW1hZ2UuYzIifQ&_nc_ht=instagram.fbaq2-2.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QENAPmEBYqD0XgbESdv9pJF9-pNrY138jFUWeLveAdPrie8eDml_YHkkYqqYKCEL4E&_nc_ohc=paiECzpSimsQ7kNvwEFEBwy&_nc_gid=1P7IGU2pRxoMwExWMZ69Pw&edm=APs17CUBAAAA&ccb=7-5&ig_cache_key=MzEwNzE4NjA5NzU5NTc5NzcwNQ%3D%3D.3-ccb7-5&oh=00_AfrsDq4q-vhSouOBmlaFjtDvp-DEgXS2GWo8N2c80T6mdg&oe=69674A6F&_nc_sid=10d13b"
                    alt="Michell Cantero Store"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        </Link>
    );
};

export default Logo;
