/**
 * Composants de formulaire basés sur react-hook-form (pattern Shadcn UI).
 *
 * Ce module fournit un ensemble de composants pour construire des formulaires:
 * - `Form`: Fournit le contexte react-hook-form à tous les champs
 * - `FormField`: Relie un champ du formulaire à react-hook-form
 * - `FormItem`: Conteneur pour un champ (label + input + message)
 * - `FormLabel`: Label associé au champ
 * - `FormControl`: Wrapper autour de l'input (Input, Textarea, etc.)
 * - `FormDescription`: Texte d'aide sous le champ
 * - `FormMessage`: Message d'erreur de validation
 *
 * Ces composants encapsulent le câblage habituel de react-hook-form et
 * standardisent l'accessibilité (id, aria-*).
 */
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * `Form` est un simple alias de `FormProvider` de react-hook-form.
 *
 * Il permet d'écrire:
 *
 * ```tsx
 * const form = useForm<MyValues>()
 *
 * return (
 *   <Form {...form}>
 *     <form onSubmit={form.handleSubmit(onSubmit)}>
 *       ...
 *     </form>
 *   </Form>
 * )
 * ```
 */
const Form = FormProvider;

/**
 * Contexte interne utilisé pour partager le nom du champ courant
 * entre les différents sous-composants (label, message, etc.).
 */
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

/**
 * `FormField` connecte un champ de formulaire (contrôlé par react-hook-form)
 * au contexte du formulaire et expose son état aux sous-composants.
 */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(
  props: ControllerProps<TFieldValues, TName>
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/**
 * Contexte utilisé pour générer des identifiants uniques par champ.
 */
type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

/**
 * Hook utilitaire pour récupérer les métadonnées et l'état d'un champ de formulaire.
 *
 * - `id`: identifiant de base du champ
 * - `formItemId`: id du conteneur
 * - `formDescriptionId`: id de la description
 * - `formMessageId`: id du message d'erreur
 * - `error`: objet d'erreur react-hook-form (s'il existe)
 */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField doit être utilisé à l'intérieur de <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext.id;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

/**
 * `FormItem` est un simple conteneur vertical pour un champ:
 * Label
 * Input
 * Message d'erreur / description
 */
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

/**
 * `FormLabel` associe un Label au champ courant via les identifiants générés.
 */
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={className}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

/**
 * `FormControl` enveloppe le composant de saisie (Input, Textarea, etc.)
 * et lui transmet l'id correct pour l'accessibilité.
 */
const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { formItemId } = useFormField();

  return <Slot ref={ref} id={formItemId} {...props} />;
});
FormControl.displayName = "FormControl";

/**
 * `FormDescription` affiche un texte d'aide sous le champ.
 */
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

/**
 * `FormMessage` affiche par défaut le message d'erreur de validation.
 *
 * - Si une erreur existe pour le champ courant, on affiche son message.
 * - Sinon, on affiche `children` (permet de forcer un message personnalisé).
 */
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { formMessageId, error } = useFormField();
  const body = error ? String(error.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};

