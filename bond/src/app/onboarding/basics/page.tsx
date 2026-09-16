'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field, Input, Textarea } from '@/components/ui/field';
import { basicsSchema, type BasicsForm } from '@/lib/types';
import { useDemoStore } from '@/store/demo-store';

const LANGUAGES = ['English', 'Spanish', 'Catalan', 'French', 'Italian', 'German', 'Portuguese'];

export default function BasicsStep() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const updateMe = useDemoStore((s) => s.updateMe);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BasicsForm>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      displayName: me?.displayName || '',
      dob: me?.dob || '',
      city: me?.city || '',
      profession: me?.profession || '',
      languages: me?.languages?.length ? me.languages : ['English'],
      intro: me?.intro || '',
    },
  });

  const languages = watch('languages');

  function onSubmit(data: BasicsForm) {
    updateMe({
      displayName: data.displayName,
      dob: data.dob,
      city: data.city,
      profession: data.profession,
      languages: data.languages,
      intro: data.intro,
    });
    router.push('/onboarding/photos');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">About you</h1>
        <p className="mt-1 text-sm text-muted-foreground">The essentials for your profile.</p>
      </div>

      <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
        <Input id="displayName" placeholder="Alex" {...register('displayName')} />
      </Field>

      <Field label="Date of birth" htmlFor="dob" hint="You must be 18 or older." error={errors.dob?.message}>
        <Input id="dob" type="date" {...register('dob')} />
      </Field>

      <Field label="City" htmlFor="city" error={errors.city?.message}>
        <Input id="city" placeholder="Barcelona" {...register('city')} />
      </Field>

      <Field label="Profession" htmlFor="profession" error={errors.profession?.message}>
        <Input id="profession" placeholder="Product Designer" {...register('profession')} />
      </Field>

      <Field label="Languages" error={errors.languages?.message as string | undefined}>
        <ChipGroup
          multiple
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
          value={languages}
          onChange={(v) => setValue('languages', v as string[], { shouldValidate: true })}
        />
      </Field>

      <Field label="Short introduction" htmlFor="intro" hint="What makes you, you?" error={errors.intro?.message}>
        <Textarea id="intro" rows={4} placeholder="Designer who reads too much and runs by the beach at dawn…" {...register('intro')} />
      </Field>

      <Button type="submit" size="block">
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
