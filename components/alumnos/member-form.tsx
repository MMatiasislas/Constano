"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  isSubscriptionSuspendedError,
  notifySubscriptionSuspended,
} from "@/components/suscripcion/subscription-toast";
import {
  memberFormSchema,
  weeklyFrequencyItems,
  weeklyFrequencyOptions,
  type MemberFormValues,
} from "@/lib/validations/member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/alumnos/photo-upload";

export type PhotoChange = { file: File | null; removed: boolean };

type MemberFormProps = {
  title: string;
  description: string;
  errorTitle: string;
  cancelHref: string;
  submitLabel: string;
  submitLoadingLabel: string;
  defaultValues: MemberFormValues;
  initialPhotoUrl: string | null;
  onSubmit: (
    values: MemberFormValues,
    photo: PhotoChange
  ) => Promise<{ error?: string } | void>;
};

export function MemberForm({
  title,
  description,
  errorTitle,
  cancelHref,
  submitLabel,
  submitLoadingLabel,
  defaultValues,
  initialPhotoUrl,
  onSubmit,
}: MemberFormProps) {
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<PhotoChange>({ file: null, removed: false });

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues,
  });

  async function handleSubmit(values: MemberFormValues) {
    setLoading(true);
    const result = await onSubmit(values, photo);

    if (result?.error) {
      if (isSubscriptionSuspendedError(result.error)) {
        notifySubscriptionSuspended();
      } else {
        toast.error(errorTitle, { description: result.error });
      }
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-[600px]">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={cancelHref} />}
        >
          Cancelar
        </Button>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PhotoUpload
                initialPhotoUrl={initialPhotoUrl}
                firstName={defaultValues.first_name}
                lastName={defaultValues.last_name ?? ""}
                onChange={(file, removed) => setPhoto({ file, removed })}
              />
            </div>
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Pérez" autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="11 2345 6789"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="juan@email.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joined_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de alta</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weekly_frequency"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Frecuencia semanal</FormLabel>
                  <Select
                    items={weeklyFrequencyItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {weeklyFrequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones, lesiones, objetivos..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? submitLoadingLabel : submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
