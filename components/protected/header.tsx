"use client";

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
    fixed?: boolean
    ref?: React.Ref<HTMLElement>
}

export const Header = ({
    className,
    fixed,
    children,
    ...props
}: HeaderProps) => {
    const [offset, setOffset] = useState(0)

    useEffect(() => {
        const onScroll = () => {
            setOffset(document.body.scrollTop || document.documentElement.scrollTop)
        }

        // Add scroll listener to the body
        document.addEventListener('scroll', onScroll, { passive: true })

        // Clean up the event listener on unmount
        return () => document.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header
            className={cn(
                'flex items-center gap-3 sm:gap-4 bg-background p-4 h-16',
                fixed && 'header-fixed peer/header w-[inherit] fixed z-50 rounded-md',
                offset > 10 && fixed ? 'shadow' : 'shadow-none',
                className
            )}
            {...props}
        >
            <Image
                src="/logo.svg"
                alt="FKMTime logo"
                width={96}
                height={128}
            />
            <Separator orientation='vertical' className='h-6' />
            {children}
        </header>
    )
}

Header.displayName = 'Header'
